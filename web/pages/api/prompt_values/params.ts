// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import type { NextApiRequest, NextApiResponse } from "next";

import {
  getValueParams,
  ValueParam,
} from "../../../lib/api/values/valueParams";
import { Result } from "../../../lib/result";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Result<ValueParam[], string>>
) {
  const client = createServerSupabaseClient({ req, res });
  const user = await client.auth.getUser();
  if (!user.data || !user.data.user) {
    res.status(401).json({ error: "Unauthorized", data: null });
    return;
  }
  const properties = await getValueParams(user.data.user.id);
  console.log("properties", properties);
  res.status(properties.error === null ? 200 : 500).json(properties);
}
