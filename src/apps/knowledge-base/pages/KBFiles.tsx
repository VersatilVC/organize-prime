import React from 'react';

export default function KBFiles() {
  React.useEffect(() => {
    document.title = 'Knowledge Base - Files';
  }, []);

  return (
    <section aria-label="Knowledge Base Files" className="space-y-4">
      <p className="text-sm text-muted-foreground">Upload and manage files for your knowledge bases.</p>
    </section>
  );
}
