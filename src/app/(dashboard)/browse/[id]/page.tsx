import React from 'react';
import FileBrowser from '@/components/file-browser';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function FolderBrowsePage({ params }: PageProps) {
  // Await params promise for Next.js 15 compliance
  const resolvedParams = await params;
  const { id } = resolvedParams;

  return <FileBrowser folderId={id} />;
}
