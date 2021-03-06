/*
 * Copyright 2017 Intel Corporation All Rights Reserved. 
 * 
 * The source code contained or described herein and all documents related to the 
 * source code ("Material") are owned by Intel Corporation or its suppliers or 
 * licensors. Title to the Material remains with Intel Corporation or its suppliers 
 * and licensors. The Material contains trade secrets and proprietary and 
 * confidential information of Intel or its suppliers and licensors. The Material 
 * is protected by worldwide copyright and trade secret laws and treaty provisions. 
 * No part of the Material may be used, copied, reproduced, modified, published, 
 * uploaded, posted, transmitted, distributed, or disclosed in any way without 
 * Intel's prior express written permission.
 * 
 * No license under any patent, copyright, trade secret or other intellectual 
 * property right is granted to or conferred upon you by disclosure or delivery of 
 * the Materials, either expressly, by implication, inducement, estoppel or 
 * otherwise. Any license under such intellectual property rights must be express 
 * and approved by Intel in writing.
 */

#include <iostream>
#include <string.h>
#include "myplugin.h"
//#include <gflags/gflags.h>
#include <functional>
#include <fstream>
#include <random>
#include <memory>
#include <chrono>
#include <vector>
#include <utility>
#include <algorithm>
#include <iterator>
#include <map>
#include <inference_engine.hpp>

//#include <samples/common.hpp>
//#include <samples/slog.hpp>
#include <common.hpp>
#include <slog.hpp>
#include "interactive_face_detection.hpp"
#include "mkldnn/mkldnn_extension_ptr.hpp"
#include <ext_list.hpp>
#include <opencv2/opencv.hpp>
#include "opencv2/imgproc/imgproc.hpp"
#include "opencv2/imgcodecs.hpp"
#include "opencv2/highgui/highgui.hpp"

#include "plugin.h"
#include <thread>
#include <mutex>      
#include <ctime>

using namespace InferenceEngine;

std::mutex mtx;

FaceDetectionClass FaceDetection;
cv::Mat mGlob(620,480,CV_8UC3);
Result Glob_result;
volatile bool need_process=false;

BaseDetection::BaseDetection(std::string commandLineFlag, std::string topoName, int maxBatch)
      : commandLineFlag(commandLineFlag), topoName(topoName), maxBatch(maxBatch) {}

bool BaseDetection::enabled() const  {
      if (!enablingChecked) {
          _enabled = !commandLineFlag.empty();
          if (!_enabled) {
              std::cout << topoName << " DISABLED" << std::endl;
          }
          enablingChecked = true;
      }
      return _enabled;
}

void BaseDetection::printPerformanceCounts() {
      if (!enabled()) {
          return;
      }
      std::cout << "Performance counts for " << topoName << std::endl << std::endl;
      ::printPerformanceCounts(request->GetPerformanceCounts(), std::cout, false);
}


void FaceDetectionClass::submitRequest(){
    if (!enquedFrames) return;
    enquedFrames = 0;
    resultsFetched = false;
    results.clear();
    BaseDetection::submitRequest();
}

void FaceDetectionClass::enqueue(const cv::Mat &frame) {
    if (!enabled()) return;

    if (!request) {
        request = net.CreateInferRequestPtr();
    }

    width = frame.cols;
    height = frame.rows;

    auto  inputBlob = request->GetBlob(input);

    matU8ToBlob<uint8_t >(frame, inputBlob);

    enquedFrames = 1;
}

void FaceDetectionClass::fetchResults() {
    if (!enabled()) return;
    results.clear();
    if (resultsFetched) return;
    resultsFetched = true;
    const float *detections = request->GetBlob(output)->buffer().as<float *>();

    for (int i = 0; i < maxProposalCount; i++) {
        float image_id = detections[i * objectSize + 0];
        Result r;
        r.label = static_cast<int>(detections[i * objectSize + 1]);
        r.confidence = detections[i * objectSize + 2];
        r.location.x = detections[i * objectSize + 3] * width;
        r.location.y = detections[i * objectSize + 4] * height;
        r.location.width = detections[i * objectSize + 5] * width - r.location.x;
        r.location.height = detections[i * objectSize + 6] * height - r.location.y;
        if (image_id < 0) {
            break;
        }
        results.push_back(r);
    }
}

InferenceEngine::CNNNetwork FaceDetectionClass::read() {
    std::cout << "Loading network files for Face Detection" << std::endl;
    InferenceEngine::CNNNetReader netReader;
    /** Read network model **/
    netReader.ReadNetwork(commandLineFlag);
    /** Set batch size to 1 **/
    std::cout << "Batch size is set to  "<< maxBatch << std::endl;
    netReader.getNetwork().setBatchSize(maxBatch);
    /** Extract model name and load it's weights **/
    std::string binFileName = fileNameNoExt(commandLineFlag) + ".bin";
    netReader.ReadWeights(binFileName);
    /** Read labels (if any)**/
    std::string labelFileName = fileNameNoExt(commandLineFlag) + ".labels";

    std::ifstream inputFile(labelFileName);
    std::copy(std::istream_iterator<std::string>(inputFile),
              std::istream_iterator<std::string>(),
              std::back_inserter(labels));
    // -----------------------------------------------------------------------------------------------------

    /** SSD-based network should have one input and one output **/
    // ---------------------------Check inputs ------------------------------------------------------
    std::cout << "Checking Face Detection inputs" << std::endl;
    InferenceEngine::InputsDataMap inputInfo(netReader.getNetwork().getInputsInfo());
    if (inputInfo.size() != 1) {
        throw std::logic_error("Face Detection network should have only one input");
    }
    auto& inputInfoFirst = inputInfo.begin()->second;
    inputInfoFirst->setPrecision(Precision::U8);
    inputInfoFirst->getInputData()->setLayout(Layout::NCHW);
    // -----------------------------------------------------------------------------------------------------

    // ---------------------------Check outputs ------------------------------------------------------
    std::cout << "Checking Face Detection outputs" << std::endl;
    InferenceEngine::OutputsDataMap outputInfo(netReader.getNetwork().getOutputsInfo());
    if (outputInfo.size() != 1) {
        throw std::logic_error("Face Detection network should have only one output");
    }
    auto& _output = outputInfo.begin()->second;
    output = outputInfo.begin()->first;

    const auto outputLayer = netReader.getNetwork().getLayerByName(output.c_str());
    if (outputLayer->type != "DetectionOutput") {
        throw std::logic_error("Face Detection network output layer(" + outputLayer->name +
            ") should be DetectionOutput, but was " +  outputLayer->type);
    }

    if (outputLayer->params.find("num_classes") == outputLayer->params.end()) {
        throw std::logic_error("Face Detection network output layer (" +
            output + ") should have num_classes integer attribute");
    }

    const int num_classes = outputLayer->GetParamAsInt("num_classes");
    if (labels.size() != num_classes) {
        if (labels.size() == (num_classes - 1))  // if network assumes default "background" class, having no label
            labels.insert(labels.begin(), "fake");
        else
            labels.clear();
    }
    const InferenceEngine::SizeVector outputDims = _output->dims;
    maxProposalCount = outputDims[1];
    objectSize = outputDims[0];
    if (objectSize != 7) {
        throw std::logic_error("Face Detection network output layer should have 7 as a last dimension");
    }
    if (outputDims.size() != 4) {
        throw std::logic_error("Face Detection network output dimensions not compatible shoulld be 4, but was " +
                                       std::to_string(outputDims.size()));
    }
    _output->setPrecision(Precision::FP32);
    _output->setLayout(Layout::NCHW);
    input = inputInfo.begin()->first;
    std::cout<<"finished reading network"<<std::endl;
    return netReader.getNetwork();
}


void Load::into(InferenceEngine::InferencePlugin & plg) const {
    if (detector.enabled()) {
        detector.net = plg.LoadNetwork(detector.read(), {});
        detector.plugin = &plg;
        std::cout<<"successfully ran loaded into"<<std::endl;
    }
}


threading_class::threading_class(){}

void threading_class::make_thread(){
  std::thread hi=std::thread(&threading_class::threading_func, this);
  hi.detach();
}

//------------calling function for the new thread-------------------
void threading_class::threading_func(){
    std::cout<<"creating new thread for inferecne async"<<std::endl;
    while (true){
        if (need_process){
          //else std::cout<<"need proc"<<std::endl;
          mtx.lock();
          cv::Mat mInput=mGlob.clone();
          mtx.unlock();
          FaceDetection.enqueue(mInput);
          FaceDetection.submitRequest();
          FaceDetection.wait();
          FaceDetection.fetchResults(); 
          mtx.lock();
          if (FaceDetection.results.size()>0){
              Glob_result=FaceDetection.results.front();
              need_process = false;
          }   
          else {
              std::cout<<"ugg no results in child thread!!!"<<std::endl;
          }
          mtx.unlock();
        }
    }
}

MyPlugin::MyPlugin()
  : frame_callback(nullptr)
  , event_callback(nullptr)
  ,device_for_faceDetection("CPU")
  ,path_to_faceDetection_model\
    (FaceDetection.commandLineFlag)
  ,cmdOptions({ {device_for_faceDetection, path_to_faceDetection_model} } ) {}



void MyPlugin::load_init()
{
    
    for (auto && option : cmdOptions) {
      auto deviceName = option.first;
      auto networkName = option.second;

      if (pluginsForDevices.find(deviceName) != pluginsForDevices.end()) {
          continue;
      }

      std::cout << "Loading plugin " << deviceName << std::endl;
      /**need to provide the absolute path to the trained model**/
      InferencePlugin plugin = PluginDispatcher\
        ({"/opt/intel/computer_vision_sdk/deployment_tools/inference_engine/lib/ubuntu_16.04/intel64", ""})\
        .getPluginByDevice(deviceName);

      /** Print plugin version **/
      printPluginVersion(plugin, std::cout);

      /** Load extensions for the CPU plugin **/
      if ((deviceName.find(device_for_faceDetection) != std::string::npos)) {
          plugin.AddExtension(std::make_shared<Extensions::Cpu::CpuExtensions>());
      } 
      pluginsForDevices[deviceName] = plugin;
    }
    Load(FaceDetection).into(this->pluginsForDevices["CPU"]);
    threading_class t_c;
    t_c.make_thread();
    std::cout<<"successfully ran loaded plugin"<<std::endl;
}


rvaStatus MyPlugin::PluginInit(std::unordered_map<std::string, std::string> params) {
      std::cout << "In face detection plugin init." << std::endl;
      std::cout << "InferenceEngine version: " << InferenceEngine::GetInferenceEngineVersion() << std::endl;
      /**initialize the plugin**/
      this->load_init();
      fflush(stdout);
      return RVA_ERR_OK;
}

rvaStatus MyPlugin::PluginClose() {
    return RVA_ERR_OK;
}

rvaStatus MyPlugin::ProcessFrameAsync(std::unique_ptr<ics::analytics::AnalyticsBuffer> buffer) {
    // fetch data from the frame and do face detection using the inference engine plugin
    // after update, send it back to analytics server.
    if (!buffer->buffer) {
        return RVA_ERR_OK;
    }
    if (buffer->width >=320 && buffer->height >=240) {   
        clock_t begin = clock();
        
        cv::Mat mYUV(buffer->height + buffer->height/2, buffer->width, CV_8UC1, buffer->buffer );
        cv::Mat mBGR(buffer->height, buffer->width, CV_8UC3);
        cv::cvtColor(mYUV,mBGR,cv::COLOR_YUV2BGR_I420);
        //--------------Update the mat for inference, and fetch the latest result  ------------------
        mtx.lock(); 
          if (mBGR.cols>0 && mBGR.rows>0){
              mGlob=mBGR.clone();
              need_process= true;
          }
          else std::cout<<"one mBGR is not qualified for inference"<<std::endl;
        mtx.unlock(); 

        std::ostringstream out;
        out.str("Face Detection Results");
        //-----------------------Draw the detection results-----------------------------------
        mtx.lock();
        if (Glob_result.confidence>0.65){
            cv::putText(mBGR,
                out.str(),
                cv::Point2f(Glob_result.location.x, Glob_result.location.y - 15),
                cv::FONT_HERSHEY_COMPLEX_SMALL,
                1.3,
                cv::Scalar(0, 0, 255));
            cv::rectangle(mBGR, Glob_result.location, cv::Scalar(255,0,0), 1);
        }  
        mtx.unlock();
        cv::cvtColor(mBGR,mYUV,cv::COLOR_BGR2YUV_I420);     
        //------------------------return the frame with 
        buffer->buffer=mYUV.data;
        clock_t end = clock();      
        //std::cout<<"time frame="<<double(end - begin) / CLOCKS_PER_SEC<<std::endl;
    }
    if (frame_callback) {
        frame_callback->OnPluginFrame(std::move(buffer));
    }
    return RVA_ERR_OK;
} 

// Declare the plugin 
DECLARE_PLUGIN(MyPlugin)

