# --- Build stage: compile and package the Spring Boot fat jar ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Cache dependencies separately from source for faster rebuilds.
COPY pom.xml ./
RUN mvn -q -B dependency:go-offline

COPY src ./src
RUN mvn -q -B clean package -DskipTests

# --- Runtime stage: slim JRE image ---
FROM eclipse-temurin:21-jre
WORKDIR /app

# Run as a non-root user.
RUN useradd --system --create-home --uid 10001 appuser
USER appuser

COPY --from=build /app/target/pansion-backend.jar app.jar

EXPOSE 8080
ENV JAVA_OPTS=""
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
