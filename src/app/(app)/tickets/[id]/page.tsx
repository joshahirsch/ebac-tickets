import Link from "next/link";
import { notFound } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, Paperclip } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can, isReadOnly } from "@/lib/rbac";
import { getTicketById } from "@/server/queries/tickets";
import { getAssignableUsers } from "@/server/queries/lookups";
import { initials } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { PriorityBadge } from "@/components/priority-badge";
import { TypeBadge } from "@/components/type-badge";
import {
  StatusSelect,
  PrioritySelect,
  TypeSelect,
  AssigneeSelect,
  DueDateField,
} from "@/components/ticket/ticket-editors";
import { TitleEditor, DescriptionEditor } from "@/components/ticket/ticket-content-editors";
import { CommentForm } from "@/components/ticket/comment-form";
import { ArchiveButton } from "@/components/ticket/archive-button";
import { AttachmentsSection } from "@/components/ticket/attachments-section";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const ticket = await getTicketById(params.id, user.workspaceId);
  if (!ticket) notFound();

  const canEdit = can(user.role, "ticket:update");
  const canComment = can(user.role, "ticket:comment");
  const canArchive = can(user.role, "ticket:archive");
  const readOnly = isReadOnly(user.role);
  const users = canEdit ? await getAssignableUsers(user.workspaceId) : [];
  const dueValue = ticket.dueDate ? format(ticket.dueDate, "yyyy-MM-dd") : null;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href="/tickets">
            <ArrowLeft className="h-4 w-4" />
            Back to tickets
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {ticket.project.key}-{ticket.number}
          </span>
          {canArchive ? <ArchiveButton ticketId={ticket.id} isArchived={ticket.isArchived} /> : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <TitleEditor ticketId={ticket.id} value={ticket.title} canEdit={canEdit} />
            </CardHeader>
            <CardContent>
              <DescriptionEditor
                ticketId={ticket.id}
                value={ticket.description ?? ""}
                canEdit={canEdit}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="comments">
                <TabsList>
                  <TabsTrigger value="comments">Comments ({ticket.comments.length})</TabsTrigger>
                  <TabsTrigger value="activity">Activity ({ticket.activities.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="comments" className="space-y-4 pt-4">
                  {ticket.comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No comments yet.</p>
                  ) : (
                    <ul className="space-y-4">
                      {ticket.comments.map((c) => (
                        <li key={c.id} className="flex gap-3">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback>
                              {initials(c.author?.name ?? c.author?.email ?? "?")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-medium">
                                {c.author?.name ?? c.author?.email ?? "Unknown"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(c.createdAt, { addSuffix: true })}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap text-sm">{c.body}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <Separator />

                  {canComment ? (
                    <CommentForm ticketId={ticket.id} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      You have read-only access and can&apos;t comment.
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="activity" className="pt-4">
                  {ticket.activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {ticket.activities.map((a) => (
                        <li key={a.id} className="flex items-start gap-2 text-sm">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                          <span className="flex-1">
                            {a.message}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {formatDistanceToNow(a.createdAt, { addSuffix: true })}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Attachments — upload/download/delete via Supabase Storage. */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Paperclip className="h-4 w-4" />
                Attachments ({ticket.attachments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AttachmentsSection
                ticketId={ticket.id}
                attachments={ticket.attachments}
                canUpload={canComment}
                canManage={canArchive}
                currentUserId={user.id}
              />
            </CardContent>
          </Card>
        </div>

        {/* Metadata sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <Field label="Status">
                {canEdit ? (
                  <StatusSelect ticketId={ticket.id} value={ticket.status} />
                ) : (
                  <StatusBadge status={ticket.status} />
                )}
              </Field>
              <Field label="Priority">
                {canEdit ? (
                  <PrioritySelect ticketId={ticket.id} value={ticket.priority} />
                ) : (
                  <PriorityBadge priority={ticket.priority} />
                )}
              </Field>
              <Field label="Type">
                {canEdit ? (
                  <TypeSelect ticketId={ticket.id} value={ticket.type} />
                ) : (
                  <TypeBadge type={ticket.type} />
                )}
              </Field>
              <Field label="Assignee">
                {canEdit ? (
                  <AssigneeSelect ticketId={ticket.id} value={ticket.assigneeId} users={users} />
                ) : (
                  <span>{ticket.assignee ? (ticket.assignee.name ?? ticket.assignee.email) : "Unassigned"}</span>
                )}
              </Field>
              <Field label="Due date">
                {canEdit ? (
                  <DueDateField ticketId={ticket.id} value={dueValue} />
                ) : (
                  <span>{ticket.dueDate ? format(ticket.dueDate, "MMM d, yyyy") : "—"}</span>
                )}
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Meta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Field label="Project">
                <Link href={`/tickets?projectId=${ticket.project.id}`} className="hover:underline">
                  {ticket.project.name}
                </Link>
              </Field>
              <Field label="Reporter">
                <span>{ticket.reporter ? (ticket.reporter.name ?? ticket.reporter.email) : "—"}</span>
              </Field>
              <Field label="Labels">
                {ticket.labels.length === 0 ? (
                  <span className="text-muted-foreground">None</span>
                ) : (
                  <span className="flex flex-wrap gap-1">
                    {ticket.labels.map((l) => (
                      <span
                        key={l.labelId}
                        className="rounded-full border px-2 py-0.5 text-xs"
                        style={{ borderColor: l.label.color, color: l.label.color }}
                      >
                        {l.label.name}
                      </span>
                    ))}
                  </span>
                )}
              </Field>
              <Field label="Created">
                <span className="text-muted-foreground">{format(ticket.createdAt, "MMM d, yyyy")}</span>
              </Field>
              <Field label="Updated">
                <span className="text-muted-foreground">
                  {formatDistanceToNow(ticket.updatedAt, { addSuffix: true })}
                </span>
              </Field>
            </CardContent>
          </Card>

          {/* Related tickets — placeholder for a future Phase. */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Related tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Linking related tickets is planned for a later phase.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {readOnly ? (
        <p className="text-center text-xs text-muted-foreground">
          You have viewer (read-only) access.
        </p>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}
