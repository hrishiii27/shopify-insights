import cron from 'node-cron';
import { syncAllTenants } from './shopifyService.js';

let schedulerStarted = false;

export function startScheduler(): void {
    if (schedulerStarted) {
        console.log('Scheduler already running');
        return;
    }

    // Sync every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
        console.log('Starting scheduled sync...');
        try {
            await syncAllTenants();
            console.log('Scheduled sync completed');
        } catch (error) {
            console.error('Scheduled sync failed:', error);
        }
    });

    // Daily cleanup of old sync logs (keep last 7 days)
    cron.schedule('0 0 * * *', async () => {
        console.log('Running daily cleanup...');
        try {
            const { PrismaClient } = await import('@prisma/client');
            const prisma = new PrismaClient();

            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const result = await prisma.syncLog.deleteMany({
                where: {
                    startedAt: { lt: sevenDaysAgo },
                },
            });

            console.log(`Cleaned up ${result.count} old sync logs`);
            await prisma.$disconnect();
        } catch (error) {
            console.error('Daily cleanup failed:', error);
        }
    });

    schedulerStarted = true;
    console.log('📅 Scheduler started - syncing every 15 minutes');
}
