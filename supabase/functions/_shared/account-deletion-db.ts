export type DbDeleteResult = {
  error: { message: string; code?: string; details?: string; hint?: string } | null;
};

export type DbAdminClient = {
  from(table: string): {
    delete(): {
      eq(column: string, value: string): Promise<DbDeleteResult>;
    };
  };
};

export type UserOwnedTable = {
  table: string;
  column: string;
};

/** Tables explicitly purged before auth user deletion. Cascades handle the rest. */
export const USER_OWNED_TABLES: UserOwnedTable[] = [
  { table: 'messages', column: 'user_id' },
  { table: 'conversations', column: 'user_id' },
  { table: 'memories', column: 'user_id' },
  { table: 'goals', column: 'user_id' },
  { table: 'reminders', column: 'user_id' },
  { table: 'profiles', column: 'id' },
];

/** Missing-table errors are tolerated in partially migrated environments. */
export function isMissingTableError(error: { message?: string; code?: string }): boolean {
  const code = (error.code ?? '').toUpperCase();
  const message = (error.message ?? '').toLowerCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    message.includes('could not find the table') ||
    (message.includes('relation') && message.includes('does not exist'))
  );
}

export type DeleteUserOwnedRowsResult = {
  deletedTables: string[];
  skippedTables: string[];
};

export async function deleteUserOwnedRows(
  admin: DbAdminClient,
  userId: string,
  tables: UserOwnedTable[] = USER_OWNED_TABLES,
): Promise<DeleteUserOwnedRowsResult> {
  const deletedTables: string[] = [];
  const skippedTables: string[] = [];

  for (const { table, column } of tables) {
    const { error } = await admin.from(table).delete().eq(column, userId);
    if (error) {
      if (isMissingTableError(error)) {
        skippedTables.push(table);
        continue;
      }
      throw new Error(`database_delete_failed:${table}:${error.message}`);
    }
    deletedTables.push(table);
  }

  return { deletedTables, skippedTables };
}
