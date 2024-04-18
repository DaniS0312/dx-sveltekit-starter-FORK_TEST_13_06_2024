import { AWS_BUCKET_NAME } from "$env/static/private";
import { fail, json } from "@sveltejs/kit";

import { S3Controller } from "$lib/server/s3.helpers";
import { prisma } from "$lib/server/prisma-instance";
import { getGuid } from "$lib/server/helpers";
import { getFileExtension } from "$lib/components/file-uploader/functions";

export async function POST({ request }) {
    const s3 = new S3Controller();
    const formData = Object.fromEntries(await request.formData());
    const files = Object.values(formData);

    if (files.length === 0) {
        return json({
            success: true
        });
    }

    const filesInfoToReturn = [];
    for (let i = 0; i < files.length; i++) {
        const fileBuffer = await files[i].arrayBuffer();
        const objectKey = getGuid();
        await s3.putObjectInBucket(AWS_BUCKET_NAME, fileBuffer, objectKey);
        try {
            await prisma.fileUpload.create({
                data: {
                    bucketName: AWS_BUCKET_NAME,
                    objectKey: objectKey,
                    displayName: files[i].name,
                    mimeType: files[i].type,
                    uploadedFileExtension: getFileExtension(files[i].name),
                    finalFileUrl: s3.getUrlFromBucketAndObjectKey(AWS_BUCKET_NAME, objectKey),
                    type: "Profile_Picture",
                    sizeType: "original",
                    linkedEntity: "userAccount"
                }
            });

            filesInfoToReturn.push({
                displayName: files[i].name,
                guid: objectKey,
                mimeType: files[i].type,
                url: await s3.createPresignedUrlForDownload({ bucketName: AWS_BUCKET_NAME, objectKey })
            });
        } catch (err) {
            console.error(err);
            return fail(400);
        }
    }

    return json({
        success: true,
        files: filesInfoToReturn
    });
}

export async function GET({ request }) {
    const fileUploads = await prisma.fileUpload.findMany({ where: { linkedEntity: "userAccount" } });
    const s3 = new S3Controller();

    const files = [];

    for (let i = 0; i < fileUploads.length; i++) {
        const url = await s3.createPresignedUrlForDownload({ bucketName: fileUploads[i].bucketName, objectKey: fileUploads[i].objectKey });
        files.push({
            url,
            guid: fileUploads[i].objectKey,
            mimeType: fileUploads[i].mimeType,
            uploadedFileExtension: getFileExtension(fileUploads[i].displayName),
            displayName: fileUploads[i].displayName
        });
    }

    return json({ files });
}

export async function DELETE({ request }) {
    const body = await request.json();
    try {
        const fileUpload = await prisma.fileUpload.findFirstOrThrow({ where: { objectKey: body.guid } });
        const s3 = new S3Controller();
        await s3.deleteObjectFromBucket(AWS_BUCKET_NAME, body.guid);
        await prisma.fileUpload.delete({ where: { id: fileUpload.id } });

        return json({ message: "Deleted successfully!" });
    } catch (err) {
        console.error(err);
    }

    return fail(400);
}