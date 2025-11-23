#!/bin/sh

echo "Waiting for MinIO server..."

until mc alias set myminio http://minio:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD; do
    echo "MinIO not ready yet..."
    sleep 2
done

echo "MinIO is up! Creating buckets..."

IFS=',' read -ra BUCKETS <<< "$MINIO_BUCKETS"
for BUCKET_PAIR in "${BUCKETS[@]}"; do
    NAME="${BUCKET_PAIR##*:}"
    echo "Creating bucket: $NAME"
    mc mb myminio/$NAME --ignore-existing
done


echo "Buckets created successfully!"
