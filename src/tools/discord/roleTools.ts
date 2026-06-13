import type { ToolDefinition } from "../types.js";

export const roleTools: ToolDefinition[] = [
  {
    name: "create_role",
    description: "Create a Discord role.",
    riskLevel: "MEDIUM",
    parameters: { name: "string", color: "optional hex or integer", reason: "optional audit log reason" },
    async execute(params, context) {
      const role = await context.guild.roles.create({
        name: String(params.name),
        color: params.color as never,
        reason: String(params.reason ?? "DAIOS requested role creation")
      });
      return { ok: true, summary: `Created role ${role.name}.`, data: { roleId: role.id } };
    }
  },
  {
    name: "delete_role",
    description: "Delete a Discord role. This is destructive and requires approval.",
    riskLevel: "HIGH",
    parameters: { roleId: "string", reason: "optional audit log reason" },
    async execute(params, context) {
      const role = await context.guild.roles.fetch(String(params.roleId));
      if (!role) return { ok: false, summary: "Role not found." };
      const name = role.name;
      await role.delete(String(params.reason ?? "DAIOS approved role deletion"));
      return { ok: true, summary: `Deleted role ${name}.` };
    }
  },
  {
    name: "edit_role",
    description: "Edit role name, color, or hoist state.",
    riskLevel: "MEDIUM",
    parameters: { roleId: "string", name: "optional string", color: "optional hex or integer", hoist: "optional boolean" },
    async execute(params, context) {
      const role = await context.guild.roles.fetch(String(params.roleId));
      if (!role) return { ok: false, summary: "Role not found." };
      await role.edit({
        name: params.name ? String(params.name) : undefined,
        color: params.color as never,
        hoist: typeof params.hoist === "boolean" ? params.hoist : undefined,
        reason: "DAIOS requested role edit"
      });
      return { ok: true, summary: `Edited role ${role.name}.` };
    }
  },
  {
    name: "assign_role",
    description: "Assign a role to a member by Discord ID or resolvable display/username.",
    riskLevel: "HIGH",
    parameters: {
      memberId: "optional Discord snowflake",
      memberName: "optional username, display name, or mention",
      roleId: "optional Discord snowflake",
      roleName: "optional role name",
      reason: "optional audit log reason"
    },
    async execute(params, context) {
      const member = await resolveMember(context.guild, params.memberId, params.memberName);
      if (!member) return { ok: false, summary: "Member not found. Use a Discord user ID, mention, username, or display name." };
      const role = await resolveRole(context.guild, params.roleId, params.roleName);
      if (!role) return { ok: false, summary: "Role not found." };
      await member.roles.add(role, String(params.reason ?? "DAIOS approved role assignment"));
      return { ok: true, summary: `Assigned ${role.name} to ${member.displayName}.` };
    }
  },
  {
    name: "remove_role",
    description: "Remove a role from a member by Discord ID or resolvable display/username.",
    riskLevel: "HIGH",
    parameters: {
      memberId: "optional Discord snowflake",
      memberName: "optional username, display name, or mention",
      roleId: "optional Discord snowflake",
      roleName: "optional role name",
      reason: "optional audit log reason"
    },
    async execute(params, context) {
      const member = await resolveMember(context.guild, params.memberId, params.memberName);
      if (!member) return { ok: false, summary: "Member not found. Use a Discord user ID, mention, username, or display name." };
      const role = await resolveRole(context.guild, params.roleId, params.roleName);
      if (!role) return { ok: false, summary: "Role not found." };
      await member.roles.remove(role, String(params.reason ?? "DAIOS approved role removal"));
      return { ok: true, summary: `Removed ${role.name} from ${member.displayName}.` };
    }
  }
];

function isSnowflake(value: unknown) {
  return typeof value === "string" && /^\d{17,20}$/.test(value);
}

function cleanLookup(value: unknown) {
  if (typeof value !== "string") return undefined;
  const mention = value.match(/^<@!?(\d{17,20})>$/);
  if (mention) return mention[1];
  return value
    .replace(/'s\s+id$/i, "")
    .replace(/\s+id$/i, "")
    .trim();
}

async function resolveMember(guild: import("discord.js").Guild, memberId: unknown, memberName: unknown) {
  const idOrName = cleanLookup(memberId) ?? cleanLookup(memberName);
  if (!idOrName) return null;
  if (isSnowflake(idOrName)) return guild.members.fetch(idOrName).catch(() => null);

  const query = idOrName.toLowerCase();
  const fetched = await guild.members.fetch({ query: idOrName, limit: 10 }).catch(() => null);
  const candidates = fetched ? [...fetched.values()] : [...guild.members.cache.values()];
  return (
    candidates.find((member) => member.displayName.toLowerCase() === query || member.user.username.toLowerCase() === query) ??
    candidates.find((member) => member.displayName.toLowerCase().includes(query) || member.user.username.toLowerCase().includes(query)) ??
    null
  );
}

async function resolveRole(guild: import("discord.js").Guild, roleId: unknown, roleName: unknown) {
  const idOrName = cleanLookup(roleId) ?? cleanLookup(roleName);
  if (!idOrName) return null;
  if (isSnowflake(idOrName)) return guild.roles.fetch(idOrName).catch(() => null);

  const query = idOrName.toLowerCase();
  return (
    guild.roles.cache.find((role) => role.name.toLowerCase() === query) ??
    guild.roles.cache.find((role) => role.name.toLowerCase().includes(query)) ??
    null
  );
}
