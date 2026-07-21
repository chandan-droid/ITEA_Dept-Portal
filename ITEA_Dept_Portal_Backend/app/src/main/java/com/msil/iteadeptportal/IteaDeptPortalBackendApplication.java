package com.msil.iteadeptportal;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class IteaDeptPortalBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(IteaDeptPortalBackendApplication.class, args);
    }

 
}
