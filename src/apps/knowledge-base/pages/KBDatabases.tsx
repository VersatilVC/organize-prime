import React from 'react';

export default function KBDatabases() {
  React.useEffect(() => {
    document.title = 'Knowledge Base - Knowledge Bases';
  }, []);

  return (
    <section aria-label="Knowledge Bases" className="space-y-4">
      <p className="text-sm text-muted-foreground">Manage your knowledge bases. Creation and management UI will appear here.</p>
    </section>
  );
}
