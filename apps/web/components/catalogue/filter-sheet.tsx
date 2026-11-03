"use client";

import { Button, Modal } from "@evone/ui";
import { type ReactNode, useState } from "react";

/** Below lg: filters open in a dialog (UX-02 mobile sheet). */
export function FilterSheet({
  activeCount,
  children,
}: {
  activeCount: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {activeCount > 0 ? `Filters (${activeCount})` : "Filters"}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Filter models"
        placement="sheet"
      >
        {children}
      </Modal>
    </div>
  );
}
