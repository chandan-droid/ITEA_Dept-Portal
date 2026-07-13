package com.msil.idpservice;

import com.msil.idpservice.config.EnvLoader;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class IdpServiceApplication {

    static {
        EnvLoader.load();
    }

    public static void main(String[] args) {
        SpringApplication.run(IdpServiceApplication.class, args);
    }

}

