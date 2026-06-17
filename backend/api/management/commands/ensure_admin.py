from django.contrib.auth.models import User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Create admin superuser if it does not exist'

    def handle(self, *args, **options):
        if User.objects.filter(username='admin').exists():
            self.stdout.write('Admin user already exists.')
            return
        User.objects.create_superuser('admin', 'admin@wasteiq.com', 'admin1234')
        self.stdout.write(self.style.SUCCESS('Admin superuser created: admin / admin1234'))
