package com.msil.iteadeptportal.shared.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.IOException;
import java.io.InputStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class SupabaseS3StorageService implements StorageService {

    private final S3Client s3Client;

    @Value("${supabase.s3.endpointUrl}")
    private String endpointUrl;

    @Override
    public String uploadFile(MultipartFile file, String bucketName, String path) {
        log.info("Uploading file {} to bucket {} at path {}", file.getOriginalFilename(), bucketName, path);
        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(path)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            // Supabase public URL format is typically:
            // endpointUrl/object/public/bucketName/path
            // We can return the path/key or construct a public URL if the bucket is public.
            // Returning the path gives the frontend/backend flexibility to construct URLs.
            return path;

        } catch (IOException e) {
            log.error("Failed to read file input stream", e);
            throw new RuntimeException("Failed to upload file to storage", e);
        } catch (S3Exception e) {
            log.error("S3 error during upload: {}", e.awsErrorDetails().errorMessage(), e);
            throw new RuntimeException("Storage service error during upload", e);
        }
    }

    @Override
    public InputStream downloadFile(String bucketName, String path) {
        log.info("Downloading file from bucket {} at path {}", bucketName, path);
        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(path)
                    .build();

            ResponseBytes<GetObjectResponse> objectBytes = s3Client.getObjectAsBytes(getObjectRequest);
            return objectBytes.asInputStream();

        } catch (S3Exception e) {
            log.error("S3 error during download: {}", e.awsErrorDetails().errorMessage(), e);
            throw new RuntimeException("Storage service error during download", e);
        }
    }

    @Override
    public void deleteFile(String bucketName, String path) {
        log.info("Deleting file from bucket {} at path {}", bucketName, path);
        try {
            DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(path)
                    .build();

            s3Client.deleteObject(deleteObjectRequest);

        } catch (S3Exception e) {
            log.error("S3 error during delete: {}", e.awsErrorDetails().errorMessage(), e);
            throw new RuntimeException("Storage service error during delete", e);
        }
    }
}
