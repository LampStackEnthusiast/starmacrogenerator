// Measurement repair candidate: run in the simulation left by Configured9Macro.
// Selects Geometry representation and completes rendering before querying bounds.
// Leaves its diagnostic scenes, PNGs and test box for inspection; does not save the simulation.
package macro;
import java.util.*;
import star.common.*;
import star.base.neo.*;
import star.meshing.*;
import star.vis.*;
public class MeasureRefinementRenderedMacro extends StarMacro {
  private static final String PART_NAME = "KM_Refinement";
  @Override public void execute() {
    Simulation sim = getActiveSimulation();
    GeometryPart part = sim.get(SimulationPartManager.class).getPart(PART_NAME);
    sim.println("MEASUREMENT TEST: " + PART_NAME + " type " + part.getClass().getName());
    readRefinementBounds(sim, part);
    sim.println("MEASUREMENT COMPLETE. No domain, physics, reports or mesh were created.");
  }
  // A MeshOperationPart has geometry but is not a SimpleBlockPart primitive.
  // Measure only that geometry in a private scene, never the user's current scene.
  private static double[][] readRefinementBounds(Simulation sim, GeometryPart output) {
    Units metres = (Units) sim.getUnitsManager().getObject("m");
    SimpleBlockPart probe = sim.get(MeshPartFactory.class)
        .createNewBlockPart(sim.get(SimulationPartManager.class));
    probe.setPresentationName("KM_Measurement_Probe_" + System.nanoTime());
    try {
      LabCoordinateSystem lab = sim.getCoordinateSystemManager().getLabCoordinateSystem();
      probe.setCoordinateSystem(lab);
      probe.getCorner1().setCoordinateSystem(lab);
      probe.getCorner2().setCoordinateSystem(lab);
      double[] expectedMin = {0.125, -0.75, 1.625};
      double[] expectedMax = {0.375, 0.5, 2.875};
      probe.getCorner1().setCoordinate(metres, metres, metres, new DoubleVector(expectedMin));
      probe.getCorner2().setCoordinate(metres, metres, metres, new DoubleVector(expectedMax));
      probe.rebuildSimpleShapePart();
      sim.println("PROBE CORNER 1 (m): " + Arrays.toString(numericArray(probe.getCorner1().getSIValue().toArray())));
      sim.println("PROBE CORNER 2 (m): " + Arrays.toString(numericArray(probe.getCorner2().getSIValue().toArray())));
      double[][] check = readIsolatedSceneBounds(sim, probe);
      for (int side = 0; side < 2; side++) {
        double[] expected = side == 0 ? expectedMin : expectedMax;
        for (int axis = 0; axis < 3; axis++)
          if (Math.abs(check[side][axis] - expected[axis]) > 1.0e-6)
            throw new IllegalStateException("Scene-bounds self-check failed: units, axis ordering or display selection are incorrect. "
                + "Expected " + Arrays.toString(expected) + ", measured " + Arrays.toString(check[side]));
      }
      sim.println("BOUNDS SELF-CHECK PASSED: known box measured in metres.");
    } finally {
      sim.println("Diagnostic box retained: " + probe.getPresentationName());
    }
    double[][] bounds = readIsolatedSceneBounds(sim, output);
    sim.println("REFINEMENT BOUNDS (m): " + Arrays.toString(bounds[0])
        + " to " + Arrays.toString(bounds[1]));
    return bounds;
  }

  private static double[][] readIsolatedSceneBounds(Simulation sim, GeometryPart part) {
    Set<Scene> before = new HashSet<>(sim.getSceneManager().getScenes());
    sim.getSceneManager().createGeometrySceneAndWait("KM_Measurement", "Outline", "Geometry", 1);
    Scene scene = null;
    for (Scene candidate : sim.getSceneManager().getScenes()) {
      if (before.contains(candidate)) continue;
      if (scene != null) throw new IllegalStateException("Expected one measurement scene.");
      scene = candidate;
    }
    if (scene == null) throw new IllegalStateException("Measurement scene was not created.");
    try {
      // Complete scene startup before assigning the measurement target.
      // Opening/initializing a geometry scene can populate its default selections.
      scene.initializeAndWait();
      scene.openInteractive();
      forceRender(sim, scene);
      sim.println("MEASUREMENT TARGET: " + part.getPresentationName());
      // PartRepresentation displayers rejected the GeometryPart container (empty
      // selections in the supplied runtime log). Select its PartSurfaces instead.
      if (!(part instanceof MeshPart))
        throw new IllegalStateException("Measurement requires a MeshPart surface manager; got " + part.getClass().getName());
      MeshPart meshPart = (MeshPart) part;
      List<PartSurface> surfaces = new ArrayList<>(meshPart.getPartSurfaceManager().getPartSurfaces());
      if (surfaces.isEmpty()) throw new IllegalStateException("Measurement target has no part surfaces: " + part.getPresentationName());
      sim.println("TARGET SURFACES: " + surfaces);
      int displayers = 0;
      for (Object object : scene.getDisplayerManager().getObjects()) {
        if (!(object instanceof PartDisplayer))
          throw new IllegalStateException("Unexpected displayer in private geometry scene: " + object.getClass().getName());
        PartDisplayer displayer = (PartDisplayer) object;
        displayer.initialize();
        setGeometryRepresentation(sim, displayer);
        displayer.setSurface(true);
        // Assign the target LAST, after initialization and representation changes.
        displayer.getInputParts().setQuery(null);
        displayer.getInputParts().setObjects(surfaces.toArray(new PartSurface[0]));
        sim.println("SELECTED INPUTS: " + displayer.getPresentationName() + " = "
            + displayer.getInputParts().getObjects());
        checkSelectedSurfaces(displayer, surfaces);
        displayers++;
      }
      if (displayers == 0) throw new IllegalStateException("Measurement scene has no geometry displayer.");
      sim.println("BEFORE RENDER: " + scene.getDrawableScene().computeVisibleBounds().toString());
      scene.resetCamera();
      forceRender(sim, scene);
      scene.resetCamera();
      for (Object object : scene.getDisplayerManager().getObjects()) {
        PartDisplayer displayer = (PartDisplayer) object;
        sim.println("AFTER RENDER INPUTS: " + displayer.getPresentationName() + " = "
            + displayer.getInputParts().getObjects());
        checkSelectedSurfaces(displayer, surfaces);
      }
      // Published STAR community example: adjacent min/max pairs for X, Y, Z.
      // Accept either within-pair order. The known-box self-check verifies axes and SI units.
      Object raw = scene.getDrawableScene().computeVisibleBounds().toArray();
      double[] values = numericArray(raw);
      sim.println("AFTER RENDER RAW: " + Arrays.toString(values));
      return unpackBounds(values);
    } finally {
      sim.println("Diagnostic scene retained: " + scene.getPresentationName());
    }
  }

  private static void checkSelectedSurfaces(PartDisplayer displayer, List<PartSurface> expected) {
    Collection<?> actual = displayer.getInputParts().getObjects();
    if (actual.size() != expected.size() || !actual.containsAll(expected))
      throw new IllegalStateException("Displayer rejected or changed the target surface selection: "
          + displayer.getPresentationName() + "; expected " + expected + "; selected " + actual);
  }

  // Pass STAR's actual Geometry object to the compatible public setter.
  // No assumption about the representation's concrete Java class is needed.
  private static void setGeometryRepresentation(Simulation sim, PartDisplayer displayer) {
    Object geometry = sim.getRepresentationManager().getObject("Geometry");
    if (geometry == null) throw new IllegalStateException("Geometry representation was not found.");
    for (java.lang.reflect.Method method : displayer.getClass().getMethods()) {
      if (!method.getName().equals("setRepresentation") || method.getParameterCount() != 1
          || !method.getParameterTypes()[0].isInstance(geometry)) continue;
      try {
        method.invoke(displayer, geometry);
        sim.println("Geometry representation type: " + geometry.getClass().getName());
        return;
      } catch (Exception error) {
        throw new IllegalStateException("Could not select Geometry representation.", error);
      }
    }
    throw new IllegalStateException("No compatible setRepresentation setter for " + geometry.getClass().getName());
  }

  // Use an actual printAndWait overload present in this installation.
  // This creates a small diagnostic PNG and waits for its render to complete.
  private static void forceRender(Simulation sim, Scene scene) {
    try {
      java.io.File png = java.io.File.createTempFile("km-bounds-", ".png");
      sim.println("Diagnostic image: " + png.getAbsolutePath());
      try {
        java.lang.reflect.Method method = scene.getClass().getMethod(
            "printAndWait", String.class, int.class, int.class, int.class);
        method.invoke(scene, png.getAbsolutePath(), 1, 640, 480);
      } catch (NoSuchMethodException noFourArgumentOverload) {
        java.lang.reflect.Method method = scene.getClass().getMethod(
            "printAndWait", String.class, int.class, int.class, int.class, boolean.class, boolean.class);
        method.invoke(scene, png.getAbsolutePath(), 1, 640, 480, true, false);
      }
      if (png.length() == 0) throw new IllegalStateException("Render produced an empty image.");
    } catch (Exception error) {
      for (java.lang.reflect.Method method : scene.getClass().getMethods())
        if (method.getName().equals("printAndWait")) sim.println(method.toGenericString());
      Throwable cause = error instanceof java.lang.reflect.InvocationTargetException
          ? ((java.lang.reflect.InvocationTargetException) error).getTargetException() : error;
      throw new IllegalStateException("Could not complete measurement scene render: " + cause, cause);
    }
  }

  private static double[] numericArray(Object raw) {
    if (raw == null || !raw.getClass().isArray())
      throw new IllegalStateException("Bounds API did not return an array.");
    int count = java.lang.reflect.Array.getLength(raw);
    double[] values = new double[count];
    for (int i = 0; i < count; i++) {
      Object value = java.lang.reflect.Array.get(raw, i);
      if (!(value instanceof Number)) throw new IllegalStateException("Non-numeric bounds value at index " + i);
      values[i] = ((Number) value).doubleValue();
    }
    return values;
  }

  private static double[][] unpackBounds(double[] values) {
    if (values.length != 6) throw new IllegalStateException("Expected six scene bounds values; got " + values.length);
    double[][] result = new double[2][3];
    for (int axis = 0; axis < 3; axis++) {
      double a = values[2 * axis], b = values[2 * axis + 1];
      if (!Double.isFinite(a) || !Double.isFinite(b) || a == b)
        throw new IllegalStateException("Invalid scene extent on axis " + axis + ": " + a + ", " + b);
      result[0][axis] = Math.min(a, b);
      result[1][axis] = Math.max(a, b);
    }
    return result;
  }
}
