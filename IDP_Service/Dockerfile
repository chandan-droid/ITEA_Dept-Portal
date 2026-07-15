# Build stage
FROM maven:3.8-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/idpservice-0.0.1-SNAPSHOT.jar app.jar
COPY setup.ldif.example setup.ldif
EXPOSE 8080 8389
ENTRYPOINT ["java", "-jar", "app.jar"]

