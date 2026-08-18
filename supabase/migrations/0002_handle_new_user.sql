-- Auto-create a candidate_profiles row whenever a new auth user signs up.
create function handle_new_user() returns trigger as $$
begin
  insert into public.candidate_profiles (user_id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
