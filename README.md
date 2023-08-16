# 510k-sift

ChatGPT came up with the name:

> SIFT: Searchable Insights from FDA's Treasure

## Node dependencies

There are two sets of Node dependencies, one for the Express server and one for the Angular frontend.

At the project root run a ```npm install``` to install the Express dependencies then run 
```cd frontend && npm install``` to install the Angular dependencies. You'll also need to build the Angular project
so inside the frontend folder run ```npm run build```.

## Python venv

The py-sentence-transformers library from Hugging Face is used for embeddings.

You'll need to set up a Python virtual environment and install the requirements from the py-sentence-transformers/ folder to generate encodings.

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

## Qdrant

We use Qdrant to power the device name vector search.

The easiest way to get Qdrant setup is with their Docker container.

```
docker pull qdrant/qdrant
docker run -p 6333:6333 qdrant/qdrant
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

## MySQL

You'll need to create a MySQL database. When the app comes up for the first time TypeORM will automatically set up the tables for you.

## OpenAI

OpenAI is used for the generative AI functions so you'll need to create an OpenAI developer account and get an OpenAI key.

## env file

Copy the .env.dist file to .env and populate the values with your values. 
Assuming you use the default Qdrant and Unstructured launch settings the values in .env.dist will work for those.

## Ingest 510(k) data

OK! Time to build the database. Run:
```
npm run ingest:download-codes
npm run ingest:createdb
```
This will download all available data from the FDA website and insert it into your local database along with the AI metadata.

## Start the app!

The Angular dev server is set up to proxy API requests to the Express server so to test things out you can run:
```
cd frontend && npm start
```

And in another session launch:
```
npm run start:dev
```

But if you're going to run this as an internet facing app you should set up something like Nginx to serve the static Angular files
and proxy the /api/ requests to Express. You'll also need to use Upstart or Supervisor to keep the Express server running.

Nginx reverse proxy config:
```
server {     
    index index.html;   
    server_name drlurker.com www.drlurker.com;
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
    server_tokens off;

    root /home/ubuntu/510k-sift/frontend/dist/frontend;

    location ~ /\.git {
      deny all;
    }

    location ~ /api {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header HOST $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_buffering off;
        proxy_cache off;
    }
    
    location / {
        try_files $uri $uri/ /index.html =404;
    }
    
    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/drlurker.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/drlurker.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}
server {
    if ($host = drlurker.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot
    server_name drlurker.com www.drlurker.com;
    listen 80;
    return 404; # managed by Certbot
}
```

Supervisor config:
```
[program:sift]
directory = /home/ubuntu/510k-sift
command = /home/ubuntu/510k-sift/startServer.sh
process_name = sift
numprocs = 1
autorestart = true
user = ubuntu
```
