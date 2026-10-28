import { Card, Grid, Stack, Typography } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import Link from "next/link";
import { RegistryList } from "@/lib/registry-types";
const renewalLabels: Record<string, string> = {
  overdue: "Past due", "due-30": "Next 30 days", "due-90": "Days 31–90", later: "After 90 days",
  unknown: "Date unavailable", "not-applicable": "Inactive entities",
};
export default function ManagementCharts({ data, scope }: { data: RegistryList; scope: string }) {
  const buckets = data.overview?.renewalBuckets ?? [];
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={5}>
        <Card sx={{ p: 3, height: "100%" }}>
          <Typography variant="h6">LEI registration status · selected scope</Typography>
          {data.total > 0 ? <PieChart height={260} series={[{ innerRadius: 60, outerRadius: 95,
            data: data.leiStatuses.map((s) => ({ id: s.status, value: s.count, label: s.status,
              color: s.status === "ISSUED" ? "#147d86" : s.status === "LAPSED" ? "#e6aa45" : undefined })),
          }]} /> : <Typography sx={{ py: 5 }}>No entities match this scope.</Typography>}
          <Stack spacing={1}>
            {data.leiStatuses.map((s) => <Typography variant="body2" key={s.status}>
              {s.status}: {s.count.toLocaleString()} ({data.total ? ((s.count / data.total) * 100).toFixed(1) : 0}%)
            </Typography>)}
          </Stack>
          <Typography variant="caption">LAPSED means registration maintenance is overdue; it does not establish insolvency.</Typography>
        </Card>
      </Grid>
      <Grid item xs={12} md={7}>
        <Card sx={{ p: 3, height: "100%" }}>
          <Typography variant="h6">Renewal outlook · selected scope</Typography>
          <Typography variant="body2" color="text.secondary">Every entity is counted once across these time buckets.</Typography>
          <BarChart height={300} layout="horizontal" hideLegend
            yAxis={[{ scaleType: "band", data: buckets.map((b) => renewalLabels[b.bucket]), width: 135 }]}
            series={[{ data: buckets.map((b) => b.count), label: "Entities", color: "#55a8b5" }]}
            xAxis={[{ label: "Entities", tickMinStep: 1 }]} />
          <Stack direction="row" flexWrap="wrap" gap={1.5}>
            {buckets.map((b) => {
              const filter = b.bucket === "not-applicable" ? "status=INACTIVE" :
                ["overdue", "due-30", "unknown"].includes(b.bucket) ? `renewal=${b.bucket}` : null;
              const text = `${renewalLabels[b.bucket]}: ${b.count.toLocaleString()}`;
              return filter ? <Link key={b.bucket} href={`/entities?${scope}&${filter}`}>{text}</Link> :
                <Typography key={b.bucket} variant="body2">{text}</Typography>;
            })}
          </Stack>
          <Typography variant="caption" display="block" mt={1.5}>
            Only active entities have renewal deadlines. Days 31–90 excludes the next 30 days. These are record maintenance dates.
          </Typography>
        </Card>
      </Grid>
    </Grid>
  );
}
