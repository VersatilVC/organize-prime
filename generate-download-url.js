// Manual script to generate download URL for your file
// Run this in browser console on your app to get the download URL

async function generateDownloadURL() {
  const filePath = "8aa2da2b-d344-4ff2-beca-d8d34c8d5262/kb-files/42991583-7d56-4e7c-b585-a6b7d57aed6a/1755350776023_Copy_of_Revealing_the_Bots_Behind_Target_s__12B_DEI_Backlash_.docx.pdf";
  
  // You'll need to get the supabase client from your app
  // This assumes supabase is available globally
  try {
    const { data, error } = await supabase.storage
      .from('kb-documents')
      .createSignedUrl(filePath, 86400); // 24 hours
      
    if (error) {
      console.error('Error generating URL:', error);
      return null;
    }
    
    console.log('Download URL:', data.signedUrl);
    return data.signedUrl;
  } catch (err) {
    console.error('Exception:', err);
    return null;
  }
}

// Call the function
generateDownloadURL();