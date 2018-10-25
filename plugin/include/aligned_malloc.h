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

#ifndef AlignedMalloc_h
#define AlignedMalloc_h

#include <stddef.h>

namespace ics {
namespace analytics {

// Returns a pointer to the first boundry of |alignment| bytes following the
// address of |ptr|.
// Note that there is no guarantee that the memory in question is available.
// |ptr| has no requirements other than it can't be NULL.
void* GetRightAlign(const void* ptr, size_t alignment);

// Allocates memory of |size| bytes aligned on an |alignment| boundry.
// The return value is a pointer to the memory. Note that the memory must
// be de-allocated using AlignedFree.
void* AlignedMalloc(size_t size, size_t alignment);
// De-allocates memory created using the AlignedMalloc() API.
void AlignedFree(void* mem_block);

// Templated versions to facilitate usage of aligned malloc without casting
// to and from void*.
template<typename T>
T* GetRightAlign(const T* ptr, size_t alignment) {
  return reinterpret_cast<T*>(GetRightAlign(reinterpret_cast<const void*>(ptr),
                                            alignment));
}
template<typename T>
T* AlignedMalloc(size_t size, size_t alignment) {
  return reinterpret_cast<T*>(AlignedMalloc(size, alignment));
}

// Deleter for use with unique_ptr. E.g., use as
//   std::unique_ptr<Foo, AlignedFreeDeleter> foo;
struct AlignedFreeDeleter {
  inline void operator()(void* ptr) const {
    AlignedFree(ptr);
  }
};

}
}

#endif
