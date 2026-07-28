import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { google, drive_v3 } from 'googleapis';

@Injectable()
export class GoogleDriveService {
  private getAuthClient(refreshToken: string) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID || 'mock_client_id',
      process.env.GOOGLE_CLIENT_SECRET || 'mock_client_secret',
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
    );
    
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return oauth2Client;
  }

  async listNewFilesInFolder(refreshToken: string, folderId: string): Promise<drive_v3.Schema$File[]> {
    try {
      const auth = this.getAuthClient(refreshToken);
      const drive = google.drive({ version: 'v3', auth });

      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false and (mimeType contains 'image/' or mimeType contains 'video/')`,
        fields: 'files(id, name, mimeType, webContentLink)',
        orderBy: 'createdTime desc',
        pageSize: 50,
      });

      return res.data.files || [];
    } catch (error) {
      console.error('Failed to list files from Google Drive:', error);
      throw new InternalServerErrorException('Failed to read Google Drive');
    }
  }

  async downloadFile(refreshToken: string, fileId: string): Promise<ArrayBuffer> {
    try {
      const auth = this.getAuthClient(refreshToken);
      const drive = google.drive({ version: 'v3', auth });

      const response = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );

      return response.data as ArrayBuffer;
    } catch (error) {
      console.error(`Failed to download file ${fileId} from Drive`, error);
      throw new InternalServerErrorException('Failed to download from Drive');
    }
  }
}
