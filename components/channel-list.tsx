"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Alert, Card, Empty, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DateTime } from "luxon";
import { getChannels } from "@/libs/api/dashboard";
import type { ChannelSummary } from "@/models/dashboard";

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return DateTime.fromISO(value)
    .setZone("Asia/Bangkok")
    .setLocale("th")
    .toFormat("dd LLL yyyy, HH:mm");
}

const columns: ColumnsType<ChannelSummary> = [
  {
    title: "Channel",
    dataIndex: "channelName",
    key: "channelName",
    render: (channelName: string | null, channel) => (
      <div>
        <Link
          className="channel-link"
          href={`/channels/${encodeURIComponent(channel.channelId)}`}
        >
          #{channelName || channel.channelId}
        </Link>
        <div className="cell-secondary">{channel.channelId}</div>
      </div>
    ),
  },
  {
    title: "สถานะ",
    key: "status",
    width: 130,
    render: () => <Tag color="green">Active</Tag>,
  },
  {
    title: "อัปเดตล่าสุด",
    dataIndex: "updatedAt",
    key: "updatedAt",
    width: 220,
    render: formatDateTime,
  },
];

export function ChannelList() {
  const query = useQuery({
    queryKey: ["channels"],
    queryFn: getChannels,
  });

  if (query.isError) {
    return (
      <Alert
        type="error"
        showIcon
        title="โหลดรายการ Channel ไม่สำเร็จ"
        description={query.error.message}
      />
    );
  }

  return (
    <Card className="dashboard-card" styles={{ body: { padding: 0 } }}>
      <Table
        rowKey="channelId"
        columns={columns}
        dataSource={query.data ?? []}
        loading={query.isPending}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        locale={{ emptyText: <Empty description="ยังไม่มีข้อมูล Channel" /> }}
        scroll={{ x: 720 }}
      />
    </Card>
  );
}
