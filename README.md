# 510k-sift

ChatGPT came up with the name:

> SIFT: Searchable Insights from FDA's Treasure

## Unstructured

This project uses the [Unstructured](https://github.com/Unstructured-IO/unstructured-inference) HTTP service to 
extract the text from the FDA PDFs. You'll need to build and launch it before you can extract the text
from the PDFs.

```
$  sudo apt-get install -y poppler-utils ffmpeg libsm6 libxext6 python3-pip build-essential libmagic-dev tesseract-ocr
```