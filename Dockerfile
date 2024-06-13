FROM python:3.9.5-slim

WORKDIR /app

COPY requirements.txt requirements.txt

RUN pip3 install -r requirements.txt

COPY . .

CMD [ "gunicorn", "--chdir", "webapp", "-b", "0.0.0.0:8000", "app:app"]