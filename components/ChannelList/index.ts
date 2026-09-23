"use client";

import { ChannelList } from "./ChannelList";
import { withChannelList } from "./withChannelList";

const ConnectedChannelList = withChannelList(ChannelList);

export { ConnectedChannelList as ChannelList };