-- =====================================================================================
-- Migration Script: 20261023_AddOrderNumToOrders.sql
-- Description:
--   1. Adds OrderNum NVARCHAR(32) column to [dbo].[Orders] for human-friendly order IDs
--      (Format: XXX-0110261415, where XXX = 3 random uppercase Latin letters, followed by ddMMyyHHmm).
--   2. Creates a non-clustered index [IX_Orders_OrderNum] for quick lookup by order number.
--   3. Backfills existing orders where OrderNum IS NULL based on CreationDate.
-- Idempotent: Safe to run multiple times.
-- =====================================================================================

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF OBJECT_ID(N'[dbo].[Orders]', N'U') IS NOT NULL
BEGIN
    -- 1. Add OrderNum column if not exists
    IF COL_LENGTH(N'[dbo].[Orders]', N'OrderNum') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Orders] ADD [OrderNum] NVARCHAR(32) NULL;
        PRINT 'Added OrderNum column to [dbo].[Orders].';
    END
    ELSE
    BEGIN
        PRINT 'Column OrderNum already exists on [dbo].[Orders].';
    END

    -- 2. Backfill existing records with null OrderNum
    IF EXISTS (SELECT 1 FROM [dbo].[Orders] WHERE [OrderNum] IS NULL)
    BEGIN
        UPDATE [dbo].[Orders]
        SET [OrderNum] = CHAR(65 + ABS(CHECKSUM(NEWID())) % 26) +
                         CHAR(65 + ABS(CHECKSUM(NEWID())) % 26) +
                         CHAR(65 + ABS(CHECKSUM(NEWID())) % 26) +
                         '-' + FORMAT(COALESCE(CreationDate, GETUTCDATE()), 'ddMMyyHHmm')
        WHERE [OrderNum] IS NULL;

        PRINT 'Backfilled OrderNum for existing records in [dbo].[Orders].';
    END
    ELSE
    BEGIN
        PRINT 'No records require backfilling for OrderNum.';
    END

    -- 3. Create index for fast lookup by OrderNum if not exists
    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes 
        WHERE name = N'IX_Orders_OrderNum' 
          AND object_id = OBJECT_ID(N'[dbo].[Orders]')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_Orders_OrderNum]
        ON [dbo].[Orders] ([OrderNum])
        WHERE [OrderNum] IS NOT NULL;

        PRINT 'Created index [IX_Orders_OrderNum] on [dbo].[Orders].';
    END
    ELSE
    BEGIN
        PRINT 'Index [IX_Orders_OrderNum] already exists.';
    END
END
ELSE
BEGIN
    PRINT 'Table [dbo].[Orders] does not exist. Skipping.';
END
GO
