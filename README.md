# 510k-sift

ChatGPT came up with the name:

> SIFT: Searchable Insights from FDA's Treasure

## Python venv

The py-sentence-transformers library from Hugging Face is used for embeddings.

You'll need to setup a Python virtual environment and install the requirements from the py-sentence-transformers/ folder to generate encodings.

**Create Python venv**

```
cd py-sentence-transformers
python3 -m venv venv
```

**Activate Python venv**

```
cd py-sentence-transformers
source venv/bin/activate
```

**Install requirements**

```
cd py-sentence-transformers
pip install -r requirements.txt
```



## Unstructured

This project uses the [Unstructured-inference](https://github.com/Unstructured-IO/unstructured-inference) HTTP service to extract the text from the FDA PDFs.

Using the Docker container is the easiest way to get setup.

```
docker pull quay.io/unstructured-io/unstructured-api:latest
docker run -p 8000:8000 -d --rm --name unstructured-api quay.io/unstructured-io/unstructured-api:latest --port 8000 --host 0.0.0.0
```

I don't know if the Docker container is able to use a GPU if you have it available though.

Test it with:

```
curl -X 'POST' \
  'http://localhost:8000/general/v0/general' \
  -H 'accept: application/json' \
  -H 'Content-Type: multipart/form-data' \
  -F 'files=@K223581.pdf' \
  -F 'strategy=hi_res' \
  | python3 -mjson.tool > out.json
```