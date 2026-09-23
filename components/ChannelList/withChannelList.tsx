"use client";

import type { FC } from "react";
import { useQuery } from "@tanstack/react-query";
import { getChannels } from "@/libs/api/dashboard";
import type { ChannelListProps, WithChannelListProps } from "./interface";

export function withChannelList(Component: FC<ChannelListProps>) {
  function WithChannelList({ className }: WithChannelListProps) {
    const { data, isPending, error } = useQuery({
      queryKey: ["channels"],
      queryFn: getChannels,
    });

    return (
      <Component
        className={className}
        channels={data ?? []}
        isPending={isPending}
        error={error?.message ?? null}
      />
    );
  }

  return WithChannelList;
}
