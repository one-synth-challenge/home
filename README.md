# Soundcloud Voting App

[![Join the chat at https://gitter.im/one-synth-challenge/home](https://badges.gitter.im/one-synth-challenge/home.svg)](https://gitter.im/one-synth-challenge/home?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Quick up and running with docker:

    docker pull postgres
    docker run --name some-postgres -e POSTGRES_PASSWORD=mysecretpassword -d -p 5432:5432 postgres
    docker exec -it <container-id> bash
    $ createdb -U postgres soundcloud-group-voting
    
