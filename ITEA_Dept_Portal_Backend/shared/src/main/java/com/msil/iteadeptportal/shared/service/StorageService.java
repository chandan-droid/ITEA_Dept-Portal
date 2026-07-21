package com.msil.iteadeptportal.shared.service;

import org.springframework.web.multipart.MultipartFile;
import java.io.InputStream;

public interface StorageService {
    
    /**
     * Uploads a file to a specific bucket with a given path.
     *
     * @param file       The multipart file to upload.
     * @param bucketName The name of the Supabase storage bucket (e.g., project-documents).
     * @param path       The path inside the bucket (e.g., project-1/architecture.pdf).
     * @return The public URL or the object key of the uploaded file.
     */
    String uploadFile(MultipartFile file, String bucketName, String path);

    /**
     * Downloads a file from a specific bucket and path.
     *
     * @param bucketName The name of the Supabase storage bucket.
     * @param path       The path inside the bucket.
     * @return An InputStream containing the file data.
     */
    InputStream downloadFile(String bucketName, String path);

    /**
     * Deletes a file from a specific bucket.
     *
     * @param bucketName The name of the Supabase storage bucket.
     * @param path       The path inside the bucket.
     */
    void deleteFile(String bucketName, String path);
}
