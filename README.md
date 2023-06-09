# 510k-sift

ChatGPT came up with the name:

> SIFT: Searchable Insights from FDA's Treasure

## Unstructured

This project uses the [Unstructured-inference](https://github.com/Unstructured-IO/unstructured-inference) HTTP service to 
extract the text from the FDA PDFs. You'll need to build and launch it before you can extract the text
from the PDFs.

Install the base [Unstructured](https://github.com/Unstructured-IO/unstructured#eight_pointed_black_star-quick-start) requirements plus build tools first 

Once that is done checkout the unstructured-inference repository and use its Makefile to install the dependencies and bring up the app.

```
$ git clone git@github.com:Unstructured-IO/unstructured-inference.git
$ cd unstructured-inference
$ make install 
$ make run-app-dev
```

If you have a GPU available (and want to use it), you'll need to install NVIDIA drivers and CUDA for your system.

```
$ sudo apt install ubuntu-drivers-common
$ sudo ubuntu-drivers autoinstall
$ wget https://developer.download.nvidia.com/compute/cuda/repos/$distribution/x86_64/cuda-keyring_1.0-1_all.deb
$ sudo dpkg -i cuda-keyring_1.0-1_all.deb
$ sudo apt-get -y install cuda cuda-drivers
```