import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import { CreateExpenseDto, CreateJournalDto } from './dto/accounting.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/auth-user';

@ApiTags('accounting')
@ApiBearerAuth()
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accounting: AccountingService) {}

  @Get('accounts')
  accounts(@CurrentUser() user: AuthUser) {
    return this.accounting.accounts(user.tenantId);
  }

  @Get('journal')
  journal(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    return this.accounting.journal(user.tenantId, {
      from,
      to,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 50
    });
  }

  @Get('journal/:id')
  entry(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.accounting.entry(user.tenantId, id);
  }

  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  @Post('journal')
  createJournal(@CurrentUser() user: AuthUser, @Body() dto: CreateJournalDto) {
    return this.accounting.createJournal(user, dto);
  }

  @Get('trial-balance')
  trialBalance(@CurrentUser() user: AuthUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.accounting.trialBalance(user.tenantId, { from, to });
  }

  @Get('income-statement')
  incomeStatement(@CurrentUser() user: AuthUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.accounting.incomeStatement(user.tenantId, { from, to });
  }

  @Get('balance-sheet')
  balanceSheet(@CurrentUser() user: AuthUser, @Query('to') to?: string) {
    return this.accounting.balanceSheet(user.tenantId, { to });
  }

  @Get('expenses')
  expenses(@CurrentUser() user: AuthUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.accounting.expenses(user.tenantId, { from, to });
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @Post('expenses')
  createExpense(@CurrentUser() user: AuthUser, @Body() dto: CreateExpenseDto) {
    return this.accounting.createExpense(user, dto);
  }
}
