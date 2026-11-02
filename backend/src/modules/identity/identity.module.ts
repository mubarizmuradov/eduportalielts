import { Global, Module } from '@nestjs/common';
import { EduportalIdentityReader } from './eduportal-identity.reader';
import { MembershipService } from './membership.service';

@Global()
@Module({
  providers: [EduportalIdentityReader, MembershipService],
  exports: [EduportalIdentityReader, MembershipService],
})
export class IdentityModule {}
