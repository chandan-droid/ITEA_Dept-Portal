# Stage 1: Build the Maven packages
FROM maven:3.9.6-eclipse-temurin-17-alpine AS builder
WORKDIR /app

# Copy pom.xml configuration files
COPY pom.xml .
COPY shared/pom.xml shared/
COPY employee-management/pom.xml employee-management/
COPY authentication/pom.xml authentication/
COPY app/pom.xml app/

# Fetch dependencies offline for caching
RUN mvn dependency:go-offline -B

# Copy all source files
COPY shared shared
COPY employee-management employee-management
COPY authentication authentication
COPY app app

# Compile and package modular monolith omitting test suite execution
RUN mvn clean package -DskipTests

# Stage 2: Runtime JRE
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy bootable JAR from builder stage
COPY --from=builder /app/app/target/app-0.0.1-SNAPSHOT.jar app.jar

# Expose server port
EXPOSE 8081

# Run Spring Boot app
ENTRYPOINT ["java", "-jar", "app.jar"]
