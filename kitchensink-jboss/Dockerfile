# ----- Stage 1: Build the application using Maven -----
FROM maven:3.8.6-openjdk-11 AS build
WORKDIR /app

# Copy the entire context into the container
COPY . .

# Build the project and package the WAR; skipping tests for speed.
RUN mvn clean package -DskipTests

# ----- Stage 2: Deploy the WAR in JBoss/WildFly -----
FROM jboss/wildfly:latest

RUN rm -rf /opt/jboss/wildfly/standalone/deployments/*

# Copy the built WAR file from the previous stage
COPY --from=build /app/target/kitchensink.war /opt/jboss/wildfly/standalone/deployments/

EXPOSE 8080

CMD ["/opt/jboss/wildfly/bin/standalone.sh", "-b", "0.0.0.0"]
