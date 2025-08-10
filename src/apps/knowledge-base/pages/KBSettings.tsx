import React from 'react';

export default function KBSettings() {
  React.useEffect(() => {
    document.title = 'Knowledge Base - Settings';
  }, []);

  return (
    <section aria-label="Knowledge Base Settings" className="space-y-4">
      <p className="text-sm text-muted-foreground">Configure defaults, models, and permissions for the Knowledge Base app.</p>
    </section>
  );
}
