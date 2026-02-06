import { createClient } from "npm:@supabase/supabase-js@2.94.1";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

import { createClient } from "npm:@supabase/supabase-js@2.94.1";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

export async function deleteStorageFolder(bucketName: string, folderPath: string) {
  const { data, error } = await supabaseAdmin.storage.from(bucketName).list(folderPath);

  if (error) {
    console.error(`Error listing files in ${bucketName}/${folderPath}:`, error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log(`No files found in ${bucketName}/${folderPath}. Nothing to delete.`);
    return;
  }

  const filePaths = data.map((file) => `${folderPath}/${file.name}`);
  const { error: deleteError } = await supabaseAdmin.storage.from(bucketName).remove(filePaths);

  if (deleteError) {
    console.error(`Error deleting files from ${bucketName}/${folderPath}:`, deleteError.message);
    // Optionally, you could throw the error to be handled by the caller
    // throw deleteError;
  } else {
    console.log(`Successfully deleted all files from ${bucketName}/${folderPath}.`);
  }
}
