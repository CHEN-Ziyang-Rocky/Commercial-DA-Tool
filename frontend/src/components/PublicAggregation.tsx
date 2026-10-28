import { Alert, Card, Typography, Stack, Chip } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { useApiData } from "@/lib/useApiData";
export function PublicAggregation({
  query,
  enabled,
}: {
  query: string;
  enabled: boolean;
}) {
  const { data, error, loading } = useApiData<{
    total: number;
    rows: {
      level: string | null;
      country: string;
      registrationStatus: string;
      count: number;
    }[];
  }>(enabled ? `/registry/aggregate?${query}` : null);
  if (!enabled)
    return (
      <Alert severity="info">
        Public structural summary is shown when text search and review filters
        are cleared. The operational list below keeps all your filters.
      </Alert>
    );
  if (error) return <Alert severity="error">Public aggregation: {error}</Alert>;
  if (!data || loading)
    return <Typography>Loading public structural summary…</Typography>;
  const rows = data.rows
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
  return (
    <Card sx={{ p: 2 }}>
      <Typography variant="h6">
        Public structure · {data.total} matching entities
      </Typography>
      <Typography variant="body2">
        Country × LEI status × relative level. Top 12 combinations shown; levels
        are relative to the selected root, not global company grades.
      </Typography>
      <Stack direction="row" spacing={1}>
        {(new URLSearchParams(query).has("root") ? ["1", "2", "3"] : []).map(
          (level) => (
            <Chip
              key={level}
              label={`Level ${level}: ${data.rows.filter((r) => r.level === level).reduce((n, r) => n + r.count, 0)}`}
            />
          ),
        )}
      </Stack>
      {rows.length > 0 ? (
        <BarChart
          height={330}
          layout="horizontal"
          yAxis={[
            {
              scaleType: "band",
              data: rows.map(
                (r) =>
                  `${r.level ?? "All"} · ${r.country} · ${r.registrationStatus}`,
              ),
              width: 160,
            },
          ]}
          series={[{ data: rows.map((r) => r.count), label: "Entities" }]}
        />
      ) : (
        <Typography>No matching entities.</Typography>
      )}
    </Card>
  );
}
