# Build the skybot plugin fat JAR from source
FROM eclipse-temurin:17-jdk AS plugin-builder

WORKDIR /build
COPY infra/skybot-lavalink-plugin/ .

RUN ./gradlew :skybot-lavalink-plugin:shadowJar --no-daemon -q

# Final image
FROM ghcr.io/lavalink-devs/lavalink:4

USER root
RUN mkdir -p /opt/Lavalink/plugins

COPY --from=plugin-builder \
     /build/plugin/build/libs/skybot-lavalink-plugin-1.7.1.jar \
     /opt/Lavalink/plugins/skybot-lavalink-plugin-1.7.1.jar

RUN chown -R lavalink:lavalink /opt/Lavalink/plugins
USER lavalink
