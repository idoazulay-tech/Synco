import { QdrantClient } from "@qdrant/js-client-rest";

export const qdrant = new QdrantClient({
  url: "https://94805bdf-7422-4359-bce4-bdb4bdd0139.us-east4-0.gcp.cloud.qdrant.io",
  apiKey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.RhkFI484mfBHjlYhsSujrQq_DrTfddwm37ZXOWwLMU4,
});

export async function testQdrantConnection() {
  try {
    const collections = await qdrant.getCollections();
    console.log("Qdrant connected successfully");
    console.log(collections);
  } catch (error) {
    console.error("Qdrant connection failed", error);
  }
}
