package com.msil.idpservice.config;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;

/**
 * Utility to load environment variables from a local .env file.
 * These variables are loaded into System properties, making them accessible to Spring's property resolver.
 */
public class EnvLoader {

    public static void load() {
        File envFile = new File(".env");
        if (!envFile.exists()) {
            // Also try parent directory in case of IDE/testing contexts running from subdirectories
            envFile = new File("../.env");
        }

        if (!envFile.exists()) {
            System.out.println("[EnvLoader] No .env file found. Falling back to system environment variables.");
            return;
        }

        System.out.println("[EnvLoader] Loading environment variables from " + envFile.getAbsolutePath());
        try (BufferedReader reader = new BufferedReader(new FileReader(envFile))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) {
                    continue;
                }
                int eqIdx = line.indexOf('=');
                if (eqIdx > 0) {
                    String key = line.substring(0, eqIdx).trim();
                    String value = line.substring(eqIdx + 1).trim();

                    // Remove wrapping quotes if present
                    if (value.startsWith("\"") && value.endsWith("\"") && value.length() >= 2) {
                        value = value.substring(1, value.length() - 1);
                    } else if (value.startsWith("'") && value.endsWith("'") && value.length() >= 2) {
                        value = value.substring(1, value.length() - 1);
                    }

                    // Set as system property if not already set
                    if (System.getProperty(key) == null) {
                        System.setProperty(key, value);
                    }
                }
            }
        } catch (IOException e) {
            System.err.println("[EnvLoader] Error reading .env file: " + e.getMessage());
        }
    }
}
