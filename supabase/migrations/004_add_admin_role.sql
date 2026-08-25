-- Add 'admin' to the user_type check constraint in profiles table
-- First, drop the existing constraint
alter table profiles drop constraint if exists profiles_user_type_check;

-- Add new constraint with 'admin' role
alter table profiles add constraint profiles_user_type_check 
  check (user_type in ('citizen', 'lawyer', 'admin'));

-- Optional: Create an admin user (run this after the user signs up, or manually)
-- update profiles set user_type = 'admin' where id = 'your-admin-user-id';

-- Grant admin access to existing admin API routes (RLS policies)
-- Admin users can read all support tickets
create policy "admins_read_all_tickets" on support_tickets for select
  using (
    exists (
      select 1 from profiles 
      where profiles.id = auth.uid() 
      and profiles.user_type = 'admin'
    )
  );

-- Admin users can update all support tickets
create policy "admins_update_all_tickets" on support_tickets for update
  using (
    exists (
      select 1 from profiles 
      where profiles.id = auth.uid() 
      and profiles.user_type = 'admin'
    )
  );

-- Admin users can read all lawyer profiles (for verification)
create policy "admins_read_all_lawyers" on lawyers for select
  using (
    exists (
      select 1 from profiles 
      where profiles.id = auth.uid() 
      and profiles.user_type = 'admin'
    )
  );

-- Admin users can update all lawyer profiles (for verification)
create policy "admins_update_all_lawyers" on lawyers for update
  using (
    exists (
      select 1 from profiles 
      where profiles.id = auth.uid() 
      and profiles.user_type = 'admin'
    )
  );

-- Admin users can read all analytics
create policy "admins_read_analytics" on analytics_events for select
  using (
    exists (
      select 1 from profiles 
      where profiles.id = auth.uid() 
      and profiles.user_type = 'admin'
    )
  );

-- Admin users can read all cases
create policy "admins_read_all_cases" on cases for select
  using (
    exists (
      select 1 from profiles 
      where profiles.id = auth.uid() 
      and profiles.user_type = 'admin'
    )
  );

-- Admin users can read all connections
create policy "admins_read_all_connections" on lawyer_connections for select
  using (
    exists (
      select 1 from profiles 
      where profiles.id = auth.uid() 
      and profiles.user_type = 'admin'
    )
  );

-- Admin users can read all direct messages
create policy "admins_read_all_direct_messages" on direct_messages for select
  using (
    exists (
      select 1 from profiles 
      where profiles.id = auth.uid() 
      and profiles.user_type = 'admin'
    )
  );

-- Admin users can read all reviews
create policy "admins_read_all_reviews" on reviews for select
  using (
    exists (
      select 1 from profiles 
      where profiles.id = auth.uid() 
      and profiles.user_type = 'admin'
    )
  );