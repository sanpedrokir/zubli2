import { Suspense } from "react";
import { requireOnboardedUser } from "@/lib/auth";
import { getProfile, listEntries } from "@/lib/data/profile";
import { listBlocked } from "@/lib/data/requests";
import { PageShell, PageHeader, EmptyState, LoadingPage, Chip } from "@/components/ui";
import { PrivacySettingsForm, EntryForm, EntryRow, DisplayNameForm, BlockedList, DeleteDataForm } from "@/components/ProfileForms";

export const metadata = { title: "My historical profile" };

async function Profile({ searchParams }) {
  const user = await requireOnboardedUser();
  const { welcome } = await searchParams;
  const [profile, entries, blocked] = await Promise.all([getProfile(user.id), listEntries(user.id), listBlocked(user.id)]);
  const included = entries.filter((e) => e.include_in_matching).length;

  return (
    <PageShell>
      <PageHeader
        eyebrow="My historical profile"
        title="The places your story passed through"
        description="Add schools, neighbourhoods, workplaces and nicknames from your past so old friends' memories can find you — only if you choose."
        actions={
          profile.discoverable ? (
            <Chip tone="strong">● Discoverable · {included} entries used</Chip>
          ) : (
            <Chip tone="clay">● Private — not used in matching</Chip>
          )
        }
      />

      {welcome && (
        <p role="status" className="mb-6 rounded-2xl border border-sage/40 bg-sage-soft px-4 py-3 text-sm">
          Welcome! Start by adding a school or a place you lived. Nothing is shared until you switch on “Discoverable”.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <section className="card">
            <h2 className="subheading">My history</h2>
            <p className="mb-5 mt-1 text-sm text-ink-soft">
              Each entry can be included in or excluded from matching. Others never see these details directly — suggestions only tell a searcher
              which of <em>their</em> clues line up.
            </p>
            {entries.length === 0 ? (
              <EmptyState title="Nothing added yet">Try your secondary school and the neighbourhood you grew up in.</EmptyState>
            ) : (
              <ul className="space-y-3">
                {entries.map((e) => (
                  <EntryRow key={e.id} entry={e} />
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <h2 className="subheading">Add an entry</h2>
            <div className="mt-4">
              <EntryForm />
            </div>
          </section>
        </div>

        <aside className="space-y-8">
          <section className="card">
            <h2 className="subheading">Privacy &amp; matching</h2>
            <p className="mb-4 mt-1 text-sm text-ink-soft">Your contact details are never shared. People can only message you after you accept an introduction.</p>
            <PrivacySettingsForm profile={profile} />
          </section>
          <section className="card">
            <h2 className="subheading">Your name</h2>
            <div className="mt-4">
              <DisplayNameForm name={user.display_name} />
            </div>
          </section>
          <section className="card">
            <h2 className="subheading">Blocked people</h2>
            <div className="mt-4">
              <BlockedList blocked={blocked} />
            </div>
          </section>
          <section className="card border-rose/40">
            <h2 className="subheading">Delete my data</h2>
            <div className="mt-4">
              <DeleteDataForm />
            </div>
          </section>
        </aside>
      </div>
    </PageShell>
  );
}

export default function Page(props) {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Profile {...props} />
    </Suspense>
  );
}
