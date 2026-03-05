# Vehicle Photo Upload Integration

## Overview

**Task:** P2-01 - Implement image picker integration for vehicle photos
**Status:** Ready for integration
**User Value:** High - allows users to capture and store vehicle photos

---

## Feature Description

Allow users to:
1. Select or capture photos using device camera/gallery
2. Preview selected photos before saving
3. Store photos locally with sync tracking
4. Upload photos to server on WiFi sync
5. View photos in OverviewScreen and VehicleScreen

---

## API Endpoints

The backend provides endpoints for vehicle photo management:

### POST /api/vehicles/{id}/photos

Upload a vehicle photo.

**Request:** `multipart/form-data`
```
vehicle_id: 1
photo: <image file>
caption: "Front view" (optional)
```

**Response:**
```json
{
  "id": 123,
  "vehicle_id": 1,
  "photo_url": "/uploads/vehicles/1/photo_123.jpg",
  "caption": "Front view",
  "created_at": "2026-02-24T10:30:00Z"
}
```

### GET /api/vehicles/{id}/photos

Get all photos for a vehicle.

**Response:**
```json
{
  "photos": [
    {
      "id": 123,
      "vehicle_id": 1,
      "photo_url": "/uploads/vehicles/1/photo_123.jpg",
      "caption": "Front view",
      "created_at": "2026-02-24T10:30:00Z"
    }
  ]
}
```

### DELETE /api/vehicles/photos/{id}

Delete a vehicle photo.

**Response:** `204 No Content`

---

## Database Schema

The `vehicle_photos` table already exists with:

```sql
CREATE TABLE vehicle_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL,
  photo_path TEXT NOT NULL,           -- Local file path or base64 data
  photo_url TEXT,                      -- Remote URL after sync
  caption TEXT,
  sort_order INTEGER DEFAULT 0,
  synced BOOLEAN DEFAULT 0,
  remote_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

CREATE INDEX idx_vehicle_photos_vehicle ON vehicle_photos(vehicle_id);
CREATE INDEX idx_vehicle_photos_synced ON vehicle_photos(synced);
```

---

## Service Layer

### VehiclePhotoService (exists in database.ts)

```typescript
// Already implemented - verify these methods exist:
const VehiclePhotoService = {
  async create(photo: Omit<VehiclePhoto, 'id' | 'created_at' | 'updated_at'>): Promise<VehiclePhoto>
  async getById(id: number): Promise<VehiclePhoto | null>
  async getAllByVehicle(vehicleId: number): Promise<VehiclePhoto[]>
  async update(id: number, photo: Partial<VehiclePhoto>): Promise<VehiclePhoto>
  async delete(id: number): Promise<void>
  async getUnsynced(): Promise<VehiclePhoto[]>
  async markSynced(id: number, remoteId: number): Promise<void>
}
```

---

## Implementation Pattern

### Step 1: Add Photo Selection to OverviewScreen

**File:** `src/screens/OverviewScreen.tsx`

Add photo selection functionality:

```typescript
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { VehiclePhotoService } from '../services/database';

const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

const pickImage = async () => {
  try {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera roll permissions to save photos.'
      );
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      
      // Save photo locally
      const photo = await VehiclePhotoService.create({
        vehicle_id: selectedVehicle!.id,
        photo_path: asset.uri,
        caption: '',
        sort_order: 0,
        synced: 0, // Mark as unsynced
      });

      logger.info(`Photo saved locally: ${photo.id}`);
      Alert.alert('Success', 'Photo saved. Will sync when on WiFi.');
      
      // Refresh photos
      loadPhotos();
    }
  } catch (error) {
    logger.error('Failed to pick image:', error);
    Alert.alert('Error', 'Failed to select photo. Please try again.');
  }
};

const takePhoto = async () => {
  try {
    // Request camera permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera permissions to take photos.'
      );
      return;
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      
      // Save photo locally
      const photo = await VehiclePhotoService.create({
        vehicle_id: selectedVehicle!.id,
        photo_path: asset.uri,
        caption: '',
        sort_order: 0,
        synced: 0,
      });

      logger.info(`Photo taken: ${photo.id}`);
      Alert.alert('Success', 'Photo saved. Will sync when on WiFi.');
      
      loadPhotos();
    }
  } catch (error) {
    logger.error('Failed to take photo:', error);
    Alert.alert('Error', 'Failed to take photo. Please try again.');
  }
};
```

---

### Step 2: Add Photo Display UI

**File:** `src/screens/OverviewScreen.tsx`

Add photo gallery section:

```typescript
import { Image } from 'expo-image';
import { TouchableOpacity } from 'react-native';

// In the vehicle overview section:
<View style={styles.photosSection}>
  <View style={styles.photosHeader}>
    <Text style={styles.sectionTitle}>Photos</Text>
    <View style={styles.photoActions}>
      <TouchableOpacity onPress={pickImage} style={styles.photoButton}>
        <Text style={styles.photoButtonText}>Gallery</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={takePhoto} style={styles.photoButton}>
        <Text style={styles.photoButtonText}>Camera</Text>
      </TouchableOpacity>
    </View>
  </View>
  
  {photos.length === 0 ? (
    <Text style={styles.emptyPhotos}>No photos yet</Text>
  ) : (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.photosScroll}
    >
      {photos.map((photo) => (
        <View key={photo.id} style={styles.photoContainer}>
          <Image
            source={{ uri: photo.photo_url || photo.photo_path }}
            style={styles.photo}
            contentFit="cover"
          />
          {photo.synced === 0 && (
            <SyncStatusBadge isSynced={false} size="small" />
          )}
          <TouchableOpacity
            style={styles.deletePhoto}
            onPress={() => handleDeletePhoto(photo.id)}
          >
            <Text style={styles.deletePhotoText}>×</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  )}
</View>
```

---

### Step 3: Add Photo Sync to SyncManager

**File:** `src/services/sync.ts`

Add photo upload to sync process:

```typescript
private async pushPhotos(): Promise<SyncResult> {
  const result: SyncResult = {
    type: 'vehicle_photos',
    pushed: 0,
    pulled: 0,
    failed: 0,
    resolved: 0,
    localWins: 0,
    remoteWins: 0,
  };

  try {
    const unsyncedPhotos = await VehiclePhotoService.getUnsynced();
    
    for (const photo of unsyncedPhotos) {
      try {
        // Create FormData for file upload
        const formData = new FormData();
        
        // Append vehicle_id
        formData.append('vehicle_id', photo.vehicle_id.toString());
        
        // Append photo file
        const photoFile: any = {
          uri: photo.photo_path,
          type: 'image/jpeg',
          name: `photo_${photo.id}.jpg`,
        };
        formData.append('photo', photoFile);
        
        // Append caption if exists
        if (photo.caption) {
          formData.append('caption', photo.caption);
        }

        // Upload to API
        const response = await this.api.uploadVehiclePhoto(formData);
        
        // Mark as synced with remote_id
        await VehiclePhotoService.markSynced(photo.id, response.id);
        
        result.pushed++;
        logger.info(`Photo synced: ${photo.id} → ${response.id}`);
        
      } catch (error) {
        logger.error(`Failed to sync photo ${photo.id}:`, error);
        result.failed++;
      }
    }
  } catch (error) {
    logger.error('Photo push failed:', error);
    result.failed += unsyncedPhotos.length;
  }

  return result;
}

private async pullPhotos(): Promise<SyncResult> {
  const result: SyncResult = {
    type: 'vehicle_photos',
    pushed: 0,
    pulled: 0,
    failed: 0,
    resolved: 0,
    localWins: 0,
    remoteWins: 0,
  };

  try {
    // Get all vehicles to fetch their photos
    const vehicles = await VehicleService.getAll();
    
    for (const vehicle of vehicles) {
      try {
        const response = await this.api.getVehiclePhotos(vehicle.id);
        
        for (const remotePhoto of response.photos) {
          // Check if photo exists locally
          const localPhoto = await VehiclePhotoService.getById(remotePhoto.id);
          
          if (localPhoto) {
            // Handle conflict resolution
            const conflict = resolveConflict(
              localPhoto,
              remotePhoto,
              'vehicle_photos'
            );
            
            if (conflict.resolved) {
              result.resolved++;
              if (conflict.localWins) {
                result.localWins++;
              } else {
                result.remoteWins++;
                // Update local with remote data
                await VehiclePhotoService.update(localPhoto.id, {
                  photo_url: remotePhoto.photo_url,
                  caption: remotePhoto.caption,
                  synced: 1,
                  remote_id: remotePhoto.id,
                });
              }
            }
          } else {
            // Insert new photo
            await VehiclePhotoService.create({
              vehicle_id: remotePhoto.vehicle_id,
              photo_path: remotePhoto.photo_url, // Use URL as path for pulled photos
              photo_url: remotePhoto.photo_url,
              caption: remotePhoto.caption,
              sort_order: remotePhoto.sort_order || 0,
              synced: 1,
              remote_id: remotePhoto.id,
            });
            result.pulled++;
          }
        }
      } catch (error) {
        logger.error(`Failed to pull photos for vehicle ${vehicle.id}:`, error);
        result.failed++;
      }
    }
  } catch (error) {
    logger.error('Photo pull failed:', error);
    result.failed++;
  }

  return result;
}
```

---

### Step 4: Add API Methods

**File:** `src/services/api.ts`

Add photo upload/fetch methods:

```typescript
async uploadVehiclePhoto(formData: FormData): Promise<{
  id: number;
  vehicle_id: number;
  photo_url: string;
  caption?: string;
}> {
  const response = await this.instance.post('/api/vehicles/photos', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

async getVehiclePhotos(vehicleId: number): Promise<{
  photos: Array<{
    id: number;
    vehicle_id: number;
    photo_url: string;
    caption?: string;
    sort_order: number;
  }>;
}> {
  const response = await this.instance.get(`/api/vehicles/${vehicleId}/photos`);
  return response.data;
}

async deleteVehiclePhoto(photoId: number): Promise<void> {
  await this.instance.delete(`/api/vehicles/photos/${photoId}`);
}
```

---

### Step 5: Add Photo Deletion

**File:** `src/screens/OverviewScreen.tsx`

```typescript
const handleDeletePhoto = async (photoId: number) => {
  Alert.alert(
    'Delete Photo',
    'Are you sure you want to delete this photo?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await VehiclePhotoService.delete(photoId);
            logger.info(`Photo deleted: ${photoId}`);
            loadPhotos();
          } catch (error) {
            logger.error('Failed to delete photo:', error);
            Alert.alert('Error', 'Failed to delete photo.');
          }
        },
      },
    ]
  );
};
```

---

## Dependencies

Ensure these packages are installed:

```json
{
  "expo-image-picker": "~15.0.0",
  "expo-file-system": "~17.0.0",
  "expo-image": "~2.0.0"
}
```

---

## Testing Checklist

- [ ] Photo selection from gallery works
- [ ] Photo capture from camera works
- [ ] Photos display in OverviewScreen
- [ ] Unsynced badge shows on new photos
- [ ] Photos upload on WiFi sync
- [ ] Synced badge shows after sync
- [ ] Photo deletion works
- [ ] Error handling for failed uploads
- [ ] Permissions requested correctly

---

## Integration Steps

1. **Backup existing files**
   ```bash
   cp src/screens/OverviewScreen.tsx src/screens/OverviewScreen.tsx.backup
   cp src/services/sync.ts src/services/sync.ts.backup
   cp src/services/api.ts src/services/api.ts.backup
   ```

2. **Update OverviewScreen.tsx**
   - Add `pickImage` and `takePhoto` functions
   - Add photo gallery UI section
   - Add `handleDeletePhoto` function
   - Import ImagePicker, FileSystem, Image

3. **Update sync.ts**
   - Add `pushPhotos` method
   - Add `pullPhotos` method
   - Integrate into `syncAll` workflow

4. **Update api.ts**
   - Add `uploadVehiclePhoto` method
   - Add `getVehiclePhotos` method
   - Add `deleteVehiclePhoto` method

5. **Test the implementation**
   - Run app and navigate to Overview
   - Select/take a photo
   - Verify photo displays with orange badge
   - Trigger sync (or wait for WiFi)
   - Verify badge turns green

---

## Troubleshooting

### Photos not uploading
- Check WiFi sync is enabled
- Verify API endpoint is correct
- Check FormData format matches backend expectations

### Permission errors
- Ensure permissions are requested before image picker
- Check app.json has camera/photo permissions configured

### Photos not displaying
- Verify photo_path is valid URI
- Check expo-image is configured correctly
- Ensure photo dimensions are appropriate

---

**Created:** 2026-02-24
**Status:** Ready for integration
