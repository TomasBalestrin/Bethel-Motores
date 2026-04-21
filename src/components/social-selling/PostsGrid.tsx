"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { PostCardCompact } from "./PostCardCompact";
import { PostDetailModal } from "./PostDetailModal";
import type { ProfilePost } from "@/services/social-profiles.service";

interface PostsGridProps {
  posts: ProfilePost[];
}

export function PostsGrid({ posts }: PostsGridProps) {
  const [selected, setSelected] = useState<ProfilePost | null>(null);

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="Nenhum post ainda"
        description="Cadastre um post para começar a registrar métricas."
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {posts.map((post) => (
          <PostCardCompact
            key={post.id}
            post={post}
            onClick={() => setSelected(post)}
          />
        ))}
      </div>
      <PostDetailModal
        post={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </>
  );
}
