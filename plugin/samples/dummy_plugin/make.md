Step to build the sample:
1. build the sample plugin
copy libplugin.so to the samples dir.
g++ myplugin.cc -o libmyplugin.so -I../include -L./ -ldl -lplugin -fPIC -shared -std=gnu++11

