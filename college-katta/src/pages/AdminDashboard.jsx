import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Badge from '@mui/material/Badge';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import { FaArrowRight } from 'react-icons/fa';
import { useFileContext } from '../context/FileContext';
import { useStudyMaterial } from '../context/StudyMaterialContext';

const AdminDashboard = () => {
  const { currentUser, isAdmin, getAllUsers, suspendUser, reactivateUser, promoteToAdmin } = useAuth();
  const { pendingFiles, approveFile, rejectFile } = useFileContext();
  const { pendingMaterials } = useStudyMaterial();
  const [tabValue, setTabValue] = useState(0);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Redirect non-admin users
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  // Fetch users data
  useEffect(() => {
    if (currentUser && isAdmin()) {
      try {
        setLoading(true);
        // Simply use the users from context instead of calling a function
        setUsers(getAllUsers());
      } catch (err) {
        setError('Failed to load users');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  }, [currentUser, isAdmin, getAllUsers]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handlePromoteUser = async (userId) => {
    const result = await promoteToAdmin(userId);
    if (result.success) {
      // Update users list to reflect changes
      setUsers(prev => prev.map(user => 
        user._id === userId ? { ...user, isAdmin: true } : user
      ));
    }
  };

  const handleSuspendUser = async (userId) => {
    const result = await suspendUser(userId);
    if (result.success) {
      // Update users list to reflect changes
      setUsers(prev => prev.map(user => 
        user._id === userId ? { ...user, status: 'suspended' } : user
      ));
    }
  };

  const handleReactivateUser = async (userId) => {
    const result = await reactivateUser(userId);
    if (result.success) {
      // Update users list to reflect changes
      setUsers(prev => prev.map(user => 
        user._id === userId ? { ...user, status: 'active' } : user
      ));
    }
  };

  const handleApproveFile = async (fileId) => {
    await approveFile(fileId);
  };

  const handleRejectFile = async (fileId) => {
    await rejectFile(fileId);
  };

  // If user is not authenticated or not an admin, don't render anything
  if (!currentUser || !isAdmin()) {
    return (
      <Container>
        <Alert severity="error">You do not have access to this page.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Admin Dashboard
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label={
            <Badge badgeContent={pendingFiles?.length || 0} color="error">
              Pending Files
            </Badge>
          } />
          <Tab label={
            <Badge badgeContent={pendingMaterials?.length || 0} color="error">
              Study Materials
            </Badge>
          } />
          <Tab label="User Management" />
        </Tabs>
      </Box>

      {/* Pending Files Tab */}
      {tabValue === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Files Pending Approval
          </Typography>
          
          {loading ? (
            <Typography>Loading...</Typography>
          ) : pendingFiles?.length === 0 ? (
            <Alert severity="info">No pending files to approve.</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Uploader</TableCell>
                    <TableCell>Branch</TableCell>
                    <TableCell>Year</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingFiles.map((file) => (
                    <TableRow key={file._id}>
                      <TableCell>{file.title}</TableCell>
                      <TableCell>{file.uploader?.username || 'Unknown'}</TableCell>
                      <TableCell>{file.branch}</TableCell>
                      <TableCell>{file.year}</TableCell>
                      <TableCell>{file.subject}</TableCell>
                      <TableCell>{file.type}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => handleApproveFile(file._id)}
                          sx={{ mr: 1 }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          onClick={() => handleRejectFile(file._id)}
                        >
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* Study Materials Tab */}
      {tabValue === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Study Materials Management
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Pending Materials
                  </Typography>
                  <Typography variant="h5" component="div">
                    {pendingMaterials?.length || 0}
                  </Typography>
                  <Typography sx={{ mb: 1.5 }} color="text.secondary">
                    materials awaiting review
                  </Typography>
                  <Button 
                    component={Link} 
                    to="/admin/study-materials" 
                    endIcon={<FaArrowRight />}
                    variant="contained"
                  >
                    Manage Materials
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {pendingMaterials?.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recent Pending Materials
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell>Uploader</TableCell>
                      <TableCell>Branch</TableCell>
                      <TableCell>Subject</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingMaterials.slice(0, 5).map((material) => (
                      <TableRow key={material._id}>
                        <TableCell>{material.title}</TableCell>
                        <TableCell>{material.uploadedBy?.name || 'Unknown'}</TableCell>
                        <TableCell>{material.branch}</TableCell>
                        <TableCell>{material.subject}</TableCell>
                        <TableCell>{material.materialType}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="contained"
                            component={Link}
                            to="/admin/study-materials"
                            color="primary"
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      )}

      {/* User Management Tab */}
      {tabValue === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            User Management
          </Typography>
          
          {loading ? (
            <Typography>Loading...</Typography>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Username</TableCell>
                    <TableCell>Full Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Branch</TableCell>
                    <TableCell>Year</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.fullName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.branch}</TableCell>
                      <TableCell>{user.year}</TableCell>
                      <TableCell>
                        <Chip 
                          label={user.isAdmin ? 'Admin' : 'User'} 
                          color={user.isAdmin ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={user.status} 
                          color={user.status === 'active' ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell>
                        {/* Don't show actions for the current admin */}
                        {user._id !== currentUser._id && (
                          <>
                            {!user.isAdmin && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                onClick={() => handlePromoteUser(user._id)}
                                sx={{ mr: 1, mb: 1 }}
                              >
                                Make Admin
                              </Button>
                            )}
                            
                            {user.status === 'active' ? (
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => handleSuspendUser(user._id)}
                              >
                                Suspend
                              </Button>
                            ) : (
                              <Button
                                size="small"
                                variant="outlined"
                                color="success"
                                onClick={() => handleReactivateUser(user._id)}
                              >
                                Reactivate
                              </Button>
                            )}
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
    </Container>
  );
};

export default AdminDashboard; 