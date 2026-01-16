async function loadApprovedIssues() {
  const owner = "irannmemorial";
  const repo = "iranmemorial";

  const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=open&labels=Approved&per_page=100`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];

  const issues = await res.json();

  return issues.map(issue => {
    const body = issue.body || "";

    const get = (label) => {
      const m = body.match(new RegExp(label + "\\s*:\\s*(.+)", "i"));
      return m ? m[1].trim() : "";
    };

    return {
      name: issue.title.replace(/\s+#\d+$/, ""),
      age: parseInt(get("Age"), 10),
      gender: get("Gender"),
      date_of_death: get("Date of death") || "unknown",
      place_of_death: get("Place of death"),
      from: get("From"),
      social_link: get("Social media")
    };
  });
}
