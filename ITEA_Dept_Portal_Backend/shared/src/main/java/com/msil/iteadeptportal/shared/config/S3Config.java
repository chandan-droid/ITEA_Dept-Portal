package com.msil.iteadeptportal.shared.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

import java.net.URI;

@Configuration
public class S3Config {

    @Value("${supabase.s3.endpointUrl}")
    private String endpointUrl;

    @Value("${supabase.s3.accessKey}")
    private String accessKey;

    @Value("${supabase.s3.secretKey}")
    private String secretKey;

    @Value("${supabase.s3.region:auto}")
    private String region;

    @Bean
    public S3Client s3Client() {
        AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);

        return S3Client.builder()
                .endpointOverride(URI.create(endpointUrl))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .region(Region.of(region))
                // Supabase S3 is typically path-style accessible
                .forcePathStyle(true)
                .build();
    }
}
