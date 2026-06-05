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
    description: "Assign a role to a member.",
    riskLevel: "HIGH",
    parameters: { memberId: "string", roleId: "string", reason: "optional audit log reason" },
    async execute(params, context) {
      const member = await context.guild.members.fetch(String(params.memberId));
      const role = await context.guild.roles.fetch(String(params.roleId));
      if (!role) return { ok: false, summary: "Role not found." };
      await member.roles.add(role, String(params.reason ?? "DAIOS approved role assignment"));
      return { ok: true, summary: `Assigned ${role.name} to ${member.displayName}.` };
    }
  },
  {
    name: "remove_role",
    description: "Remove a role from a member.",
    riskLevel: "HIGH",
    parameters: { memberId: "string", roleId: "string", reason: "optional audit log reason" },
    async execute(params, context) {
      const member = await context.guild.members.fetch(String(params.memberId));
      const role = await context.guild.roles.fetch(String(params.roleId));
      if (!role) return { ok: false, summary: "Role not found." };
      await member.roles.remove(role, String(params.reason ?? "DAIOS approved role removal"));
      return { ok: true, summary: `Removed ${role.name} from ${member.displayName}.` };
    }
  }
];
