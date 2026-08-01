# Frontend Docker image workflow

This guide shows how to build the frontend image locally, save it as a tar archive, and load it on a Raspberry Pi.

## 1. Build the Docker image for the Raspberry Pi

Because the Pi uses ARM64, build the image for that platform explicitly:

```bash
docker buildx build --platform linux/arm64 -t vocab-frontend:latest --load ./frontend
```

This creates a local image that is compatible with the Pi architecture.

If you want to use a different tag, replace `vocab-frontend:latest` with your preferred name.

## 2. Export the image as a .tar file

Save the built image to a tar archive:

```bash
docker save -o vocab-frontend.tar vocab-frontend:latest
```

This creates a file named `vocab-frontend.tar` in your current directory.

## 3. Copy the tar file to the Raspberry Pi

Transfer the tar file to the Pi with `scp` (or any other preferred method):

```bash
scp vocab-frontend.tar pi@<pi-host>:/home/pi/
```

## 4. Load the image on the Raspberry Pi

On the Pi, load the image into Docker:

```bash
docker load -i vocab-frontend.tar
```

You can confirm it is available with:

```bash
docker images
```

## 5. Run the image

You can then run it directly or use it from Docker Compose:

```bash
docker run -p 3000:80 --name vocab-frontend vocab-frontend:latest
```

If you are using the compose setup in the project root, make sure the frontend service references the same image tag:

```yaml
services:
  frontend:
    image: vocab-frontend:latest
```

## Notes

- The tar file is useful when the Pi does not have direct access to the Docker build environment.
- If you change the image tag, update the tag in both the export and import commands and in your compose file.
